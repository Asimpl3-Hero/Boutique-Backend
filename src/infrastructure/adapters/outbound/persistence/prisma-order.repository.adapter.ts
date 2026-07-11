import { Injectable } from '@nestjs/common';
import type { Order, OrderStatus } from '../../../../domain/entities';
import type {
  CreatePendingOrderInput,
  OrderRepositoryPort,
} from '../../../../domain/ports';
import { AppError } from '../../../../shared/errors';
import { Result, err, ok } from '../../../../shared/railway';
import { PrismaService } from './prisma.service';

interface OrderRow {
  id: string;
  productId: string;
  customerId: string;
  quantity: number;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  taxRatePercent: number;
  taxInCents: number;
  amountInCents: number;
  currency: string;
  status: string;
  createdAt: Date;
  customer?: { email: string } | null;
  transaction?: { providerTransactionId: string | null } | null;
  delivery?: {
    fullName: string;
    email: string;
    phone: string | null;
    address1: string;
    address2: string | null;
    city: string;
    state: string;
    zip: string;
    country: string | null;
  } | null;
}

const INCLUDE_RELATIONS = {
  customer: true,
  transaction: true,
  delivery: true,
} as const;

@Injectable()
export class PrismaOrderRepositoryAdapter implements OrderRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  public async createPending(
    input: CreatePendingOrderInput,
  ): Promise<Result<Order, AppError>> {
    try {
      const order = await this.prisma.order.create({
        data: {
          productId: input.productId,
          customerId: input.customerId,
          quantity: input.quantity,
          baseFeeInCents: input.baseFeeInCents,
          deliveryFeeInCents: input.deliveryFeeInCents,
          taxRatePercent: input.taxRatePercent,
          taxInCents: input.taxInCents,
          amountInCents: input.amountInCents,
          currency: input.currency,
          status: 'PENDING',
        },
        include: INCLUDE_RELATIONS,
      });

      return ok(this.toDomain(order));
    } catch (cause) {
      return err({
        code: 'PERSISTENCE_ERROR',
        message: 'Failed to create order.',
        details: cause,
      });
    }
  }

  public async findById(id: string): Promise<Result<Order | null, AppError>> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id },
        include: INCLUDE_RELATIONS,
      });

      return ok(order ? this.toDomain(order) : null);
    } catch (cause) {
      return err({
        code: 'PERSISTENCE_ERROR',
        message: 'Failed to fetch order by id.',
        details: cause,
      });
    }
  }

  public async findByCustomerId(
    customerId: string,
  ): Promise<Result<Order[], AppError>> {
    try {
      const orders = await this.prisma.order.findMany({
        where: { customerId },
        include: INCLUDE_RELATIONS,
        orderBy: { createdAt: 'desc' },
      });

      return ok(orders.map((order) => this.toDomain(order)));
    } catch (cause) {
      return err({
        code: 'PERSISTENCE_ERROR',
        message: 'Failed to fetch customer orders.',
        details: cause,
      });
    }
  }

  public async findPending(): Promise<Result<Order[], AppError>> {
    try {
      const orders = await this.prisma.order.findMany({
        where: { status: 'PENDING' },
        include: INCLUDE_RELATIONS,
        orderBy: { createdAt: 'asc' },
      });

      return ok(orders.map((order) => this.toDomain(order)));
    } catch (cause) {
      return err({
        code: 'PERSISTENCE_ERROR',
        message: 'Failed to fetch pending orders.',
        details: cause,
      });
    }
  }

  public async updateStatus(
    id: string,
    status: OrderStatus,
  ): Promise<Result<Order, AppError>> {
    try {
      const order = await this.prisma.order.update({
        where: { id },
        data: { status },
        include: INCLUDE_RELATIONS,
      });

      return ok(this.toDomain(order));
    } catch (cause) {
      return err({
        code: 'PERSISTENCE_ERROR',
        message: 'Failed to update order status.',
        details: cause,
      });
    }
  }

  /**
   * Approves the order and decrements product stock atomically.
   * A conditional `updateMany` (stock >= qty) guards against overselling.
   */
  public async approveOrderAndDecrementStock(
    id: string,
  ): Promise<Result<Order, AppError>> {
    try {
      const approvedOrder = await this.prisma.$transaction(async (tx) => {
        const currentOrder = await tx.order.findUnique({ where: { id } });

        if (!currentOrder) {
          throw this.typedError('ORDER_NOT_FOUND', `Order ${id} was not found.`);
        }

        // Idempotency: if already finalized, just return the current snapshot.
        if (currentOrder.status !== 'PENDING') {
          const full = await tx.order.findUnique({
            where: { id },
            include: INCLUDE_RELATIONS,
          });
          return full!;
        }

        const qty = currentOrder.quantity > 0 ? currentOrder.quantity : 1;

        const updatedProduct = await tx.product.updateMany({
          where: { id: currentOrder.productId, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
        });

        if (updatedProduct.count === 0) {
          throw this.typedError(
            'OUT_OF_STOCK',
            `Product ${currentOrder.productId} does not have enough stock.`,
          );
        }

        return tx.order.update({
          where: { id },
          data: { status: 'APPROVED' },
          include: INCLUDE_RELATIONS,
        });
      });

      return ok(this.toDomain(approvedOrder));
    } catch (cause) {
      const appError = this.fromTypedError(cause);
      if (appError) {
        return err(appError);
      }

      return err({
        code: 'PERSISTENCE_ERROR',
        message: 'Failed to finalize approved order.',
        details: cause,
      });
    }
  }

  private toDomain(order: OrderRow): Order {
    return {
      id: order.id,
      productId: order.productId,
      customerId: order.customerId,
      quantity: order.quantity > 0 ? order.quantity : 1,
      baseFeeInCents: order.baseFeeInCents,
      deliveryFeeInCents: order.deliveryFeeInCents,
      taxRatePercent: order.taxRatePercent,
      taxInCents: order.taxInCents,
      amountInCents: order.amountInCents,
      currency: order.currency,
      status: order.status as OrderStatus,
      createdAt: order.createdAt,
      customerEmail: order.customer?.email,
      providerTransactionId:
        order.transaction?.providerTransactionId ?? undefined,
      shippingData: order.delivery
        ? {
            fullName: order.delivery.fullName,
            email: order.delivery.email,
            phone: order.delivery.phone ?? undefined,
            address1: order.delivery.address1,
            address2: order.delivery.address2 ?? undefined,
            city: order.delivery.city,
            state: order.delivery.state,
            zip: order.delivery.zip,
            country: order.delivery.country ?? undefined,
          }
        : undefined,
    };
  }

  private typedError(code: AppError['code'], message: string): Error {
    return new Error(JSON.stringify({ __appErrorCode: code, message }));
  }

  private fromTypedError(cause: unknown): AppError | null {
    if (!(cause instanceof Error)) {
      return null;
    }

    try {
      const parsed = JSON.parse(cause.message) as {
        __appErrorCode?: AppError['code'];
        message?: string;
      };

      if (!parsed.__appErrorCode || !parsed.message) {
        return null;
      }

      return { code: parsed.__appErrorCode, message: parsed.message };
    } catch {
      return null;
    }
  }
}
