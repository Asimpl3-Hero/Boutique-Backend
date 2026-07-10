import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  ORDER_REPOSITORY_PORT,
  TRANSACTION_REPOSITORY_PORT,
  PAYMENT_GATEWAY_PORT,
} from '../../../../domain/ports';
import type {
  OrderRepositoryPort,
  TransactionRepositoryPort,
  PaymentGatewayPort,
  ProviderTransactionStatus,
  OrderStatusPollingPort,
} from '../../../../domain/ports';
import type { Order } from '../../../../domain/entities';
import { AppError } from '../../../../shared/errors';
import { Err, Ok, Result, err, ok } from '../../../../shared/railway';

const POLLING_BASE_INTERVAL_MS = 5000;
const POLLING_MAX_BACKOFF_MS = 15000;
const POLLING_TIMEOUT_MS = 60000;
const POLLING_MAX_FAILURE_RETRIES = 5;

interface PollerState {
  timer: NodeJS.Timeout;
  consecutiveFailures: number;
}

@Injectable()
export class OrderStatusPollingService
  implements OrderStatusPollingPort, OnModuleDestroy, OnModuleInit
{
  private readonly logger = new Logger(OrderStatusPollingService.name);
  private readonly activePollers = new Map<string, PollerState>();

  constructor(
    @Inject(ORDER_REPOSITORY_PORT)
    private readonly orderRepository: OrderRepositoryPort,
    @Inject(TRANSACTION_REPOSITORY_PORT)
    private readonly transactionRepository: TransactionRepositoryPort,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly paymentGateway: PaymentGatewayPort,
  ) {}

  public async start(
    orderId: string,
    providerTransactionId: string,
  ): Promise<Result<void, AppError>> {
    return this.startInternal(orderId, providerTransactionId, Date.now());
  }

  public async onModuleInit(): Promise<void> {
    const pendingOrdersResult = await this.orderRepository.findPending();
    if (pendingOrdersResult.isErr()) {
      this.logger.error('Failed to rehydrate pending orders for polling.');
      return;
    }

    const pendingOrders = (pendingOrdersResult as Ok<Order[]>).value;

    for (const order of pendingOrders) {
      if (!order.providerTransactionId) {
        this.logger.warn(
          `Skipping polling rehydration for order ${order.id}: no provider transaction linked yet.`,
        );
        continue;
      }

      const resumed = await this.startInternal(
        order.id,
        order.providerTransactionId,
        order.createdAt.getTime(),
      );
      if (resumed.isErr()) {
        this.logger.warn(`Could not resume polling for order ${order.id}.`);
      }
    }
  }

  public onModuleDestroy(): void {
    for (const state of this.activePollers.values()) {
      clearTimeout(state.timer);
    }

    this.activePollers.clear();
  }

  private async startInternal(
    orderId: string,
    providerTransactionId: string,
    startedAt: number,
  ): Promise<Result<void, AppError>> {
    if (this.activePollers.has(orderId)) {
      return ok(undefined);
    }

    try {
      this.scheduleNextPoll(orderId, providerTransactionId, startedAt);
      return ok(undefined);
    } catch (cause) {
      return err({
        code: 'POLLING_ERROR',
        message: 'Failed to initialize polling.',
        details: cause,
      });
    }
  }

  private scheduleNextPoll(
    orderId: string,
    providerTransactionId: string,
    startedAt: number,
    delayMs = POLLING_BASE_INTERVAL_MS,
  ): void {
    const timer = setTimeout(() => {
      void this.poll(orderId, providerTransactionId, startedAt);
    }, delayMs);

    this.setPollerState(orderId, timer);
  }

  private async poll(
    orderId: string,
    providerTransactionId: string,
    startedAt: number,
  ): Promise<void> {
    try {
      if (Date.now() - startedAt >= POLLING_TIMEOUT_MS) {
        this.stop(orderId);
        this.logger.warn(
          `Polling timeout reached for order ${orderId}. Keeping status as PENDING.`,
        );
        return;
      }

      const statusResult =
        await this.paymentGateway.getTransactionStatus(providerTransactionId);

      if (statusResult.isErr()) {
        this.handleFailure(
          orderId,
          providerTransactionId,
          startedAt,
          (statusResult as Err<AppError>).error,
        );
        return;
      }

      this.resetFailureCount(orderId);
      const { orderStatus } = (statusResult as Ok<ProviderTransactionStatus>)
        .value;

      if (orderStatus === 'APPROVED' || orderStatus === 'DECLINED') {
        await this.finalize(orderId, orderStatus);
        return;
      }

      this.scheduleNextPoll(orderId, providerTransactionId, startedAt);
    } catch (cause) {
      this.handleUnexpected(orderId, providerTransactionId, startedAt, cause);
    }
  }

  private async finalize(
    orderId: string,
    orderStatus: 'APPROVED' | 'DECLINED',
  ): Promise<void> {
    this.stop(orderId);

    const updateResult =
      orderStatus === 'APPROVED'
        ? await this.orderRepository.approveOrderAndDecrementStock(orderId)
        : await this.orderRepository.updateStatus(orderId, orderStatus);

    if (updateResult.isErr()) {
      this.logger.error(
        `Failed to update order ${orderId} with status ${orderStatus}.`,
      );
      return;
    }

    await this.transactionRepository.updateStatus(orderId, orderStatus);
  }

  private handleFailure(
    orderId: string,
    providerTransactionId: string,
    startedAt: number,
    error: AppError,
  ): void {
    const failures = this.bumpFailureCount(orderId);

    if (failures >= POLLING_MAX_FAILURE_RETRIES) {
      this.logger.warn(
        `Polling failed for order ${orderId}. retriesExhausted=${failures} error=${error.code}`,
      );
      this.stop(orderId);
      return;
    }

    const retryDelayMs = this.computeRetryDelayMs(failures);
    this.scheduleNextPoll(
      orderId,
      providerTransactionId,
      startedAt,
      retryDelayMs,
    );
  }

  private handleUnexpected(
    orderId: string,
    providerTransactionId: string,
    startedAt: number,
    cause: unknown,
  ): void {
    const failures = this.bumpFailureCount(orderId);

    if (failures >= POLLING_MAX_FAILURE_RETRIES) {
      this.logger.error(
        `Unexpected polling error for order ${orderId}. retriesExhausted=${failures}`,
        cause instanceof Error ? cause.stack : undefined,
      );
      this.stop(orderId);
      return;
    }

    this.scheduleNextPoll(
      orderId,
      providerTransactionId,
      startedAt,
      this.computeRetryDelayMs(failures),
    );
  }

  private stop(orderId: string): void {
    const state = this.activePollers.get(orderId);
    if (!state) {
      return;
    }

    clearTimeout(state.timer);
    this.activePollers.delete(orderId);
  }

  private setPollerState(orderId: string, timer: NodeJS.Timeout): void {
    const previousState = this.activePollers.get(orderId);
    this.activePollers.set(orderId, {
      timer,
      consecutiveFailures: previousState?.consecutiveFailures ?? 0,
    });
  }

  private bumpFailureCount(orderId: string): number {
    const state = this.activePollers.get(orderId);
    if (!state) {
      return 1;
    }

    const consecutiveFailures = state.consecutiveFailures + 1;
    this.activePollers.set(orderId, { ...state, consecutiveFailures });
    return consecutiveFailures;
  }

  private resetFailureCount(orderId: string): void {
    const state = this.activePollers.get(orderId);
    if (!state || state.consecutiveFailures === 0) {
      return;
    }

    this.activePollers.set(orderId, { ...state, consecutiveFailures: 0 });
  }

  private computeRetryDelayMs(consecutiveFailures: number): number {
    const exponent = Math.max(0, consecutiveFailures - 1);
    return Math.min(
      POLLING_BASE_INTERVAL_MS * 2 ** exponent,
      POLLING_MAX_BACKOFF_MS,
    );
  }
}
