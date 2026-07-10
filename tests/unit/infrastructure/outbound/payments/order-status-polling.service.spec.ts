import { OrderStatusPollingService } from '../../../../../src/infrastructure/adapters/outbound/payments/order-status-polling.service';
import { ok, err } from '../../../../../src/shared/railway';
import {
  createOrderRepositoryMock,
  createTransactionRepositoryMock,
  createPaymentGatewayMock,
} from '../../../../helpers/mocks/ports.mock';
import { makeOrder } from '../../../../helpers/factories/order.factory';

const build = () => {
  const orderRepository = createOrderRepositoryMock();
  const transactionRepository = createTransactionRepositoryMock();
  const paymentGateway = createPaymentGatewayMock();

  transactionRepository.updateStatus.mockResolvedValue(
    ok({
      id: 'tx1',
      orderId: 'o1',
      providerTransactionId: 'prov_1',
      status: 'APPROVED',
      createdAt: new Date(),
    }),
  );

  const service = new OrderStatusPollingService(
    orderRepository,
    transactionRepository,
    paymentGateway,
  );

  return { service, orderRepository, transactionRepository, paymentGateway };
};

describe('OrderStatusPollingService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('finalizes the order atomically when the provider approves', async () => {
    const { service, orderRepository, transactionRepository, paymentGateway } =
      build();
    paymentGateway.getTransactionStatus.mockResolvedValue(
      ok({ providerStatus: 'APPROVED', orderStatus: 'APPROVED' }),
    );
    orderRepository.approveOrderAndDecrementStock.mockResolvedValue(
      ok(makeOrder({ status: 'APPROVED' })),
    );

    await service.start('o1', 'prov_1');
    await jest.advanceTimersByTimeAsync(5000);

    expect(orderRepository.approveOrderAndDecrementStock).toHaveBeenCalledWith('o1');
    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
    expect(transactionRepository.updateStatus).toHaveBeenCalledWith('o1', 'APPROVED');
  });

  it('updates the order to DECLINED when the provider declines', async () => {
    const { service, orderRepository, paymentGateway } = build();
    paymentGateway.getTransactionStatus.mockResolvedValue(
      ok({ providerStatus: 'DECLINED', orderStatus: 'DECLINED' }),
    );
    orderRepository.updateStatus.mockResolvedValue(
      ok(makeOrder({ status: 'DECLINED' })),
    );

    await service.start('o1', 'prov_1');
    await jest.advanceTimersByTimeAsync(5000);

    expect(orderRepository.updateStatus).toHaveBeenCalledWith('o1', 'DECLINED');
    expect(orderRepository.approveOrderAndDecrementStock).not.toHaveBeenCalled();
  });

  it('stops after timeout without forcing a final status', async () => {
    const { service, orderRepository, paymentGateway } = build();
    paymentGateway.getTransactionStatus.mockResolvedValue(
      ok({ providerStatus: 'PENDING', orderStatus: 'PENDING' }),
    );

    await service.start('o1', 'prov_1');
    await jest.advanceTimersByTimeAsync(60000);

    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
    expect(orderRepository.approveOrderAndDecrementStock).not.toHaveBeenCalled();
  });

  it('does not duplicate pollers for the same order', async () => {
    const { service, orderRepository, paymentGateway } = build();
    paymentGateway.getTransactionStatus.mockResolvedValue(
      ok({ providerStatus: 'APPROVED', orderStatus: 'APPROVED' }),
    );
    orderRepository.approveOrderAndDecrementStock.mockResolvedValue(
      ok(makeOrder({ status: 'APPROVED' })),
    );

    await service.start('o1', 'prov_1');
    await service.start('o1', 'prov_1');
    await jest.advanceTimersByTimeAsync(5000);

    expect(paymentGateway.getTransactionStatus).toHaveBeenCalledTimes(1);
  });

  it('retries with backoff on transient provider errors', async () => {
    const { service, orderRepository, paymentGateway } = build();
    paymentGateway.getTransactionStatus
      .mockResolvedValueOnce(err({ code: 'PAYMENT_PROVIDER_ERROR', message: 'temp' }))
      .mockResolvedValueOnce(err({ code: 'PAYMENT_PROVIDER_ERROR', message: 'temp2' }))
      .mockResolvedValueOnce(ok({ providerStatus: 'APPROVED', orderStatus: 'APPROVED' }));
    orderRepository.approveOrderAndDecrementStock.mockResolvedValue(
      ok(makeOrder({ status: 'APPROVED' })),
    );

    await service.start('o1', 'prov_1');

    await jest.advanceTimersByTimeAsync(15000);
    expect(paymentGateway.getTransactionStatus).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(5000);
    expect(paymentGateway.getTransactionStatus).toHaveBeenCalledTimes(3);
    expect(orderRepository.approveOrderAndDecrementStock).toHaveBeenCalledWith('o1');
  });

  it('stops after the max number of failed retries', async () => {
    const { service, orderRepository, paymentGateway } = build();
    paymentGateway.getTransactionStatus.mockResolvedValue(
      err({ code: 'PAYMENT_PROVIDER_ERROR', message: 'temp' }),
    );

    await service.start('o1', 'prov_1');
    await jest.advanceTimersByTimeAsync(70000);

    expect(paymentGateway.getTransactionStatus).toHaveBeenCalledTimes(5);
    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('rehydrates pending orders on module init', async () => {
    const { service, orderRepository, paymentGateway } = build();
    orderRepository.findPending.mockResolvedValue(
      ok([makeOrder({ id: 'o1', providerTransactionId: 'prov_1' })]),
    );
    paymentGateway.getTransactionStatus.mockResolvedValue(
      ok({ providerStatus: 'APPROVED', orderStatus: 'APPROVED' }),
    );
    orderRepository.approveOrderAndDecrementStock.mockResolvedValue(
      ok(makeOrder({ status: 'APPROVED' })),
    );

    await service.onModuleInit();
    await jest.advanceTimersByTimeAsync(5000);

    expect(orderRepository.findPending).toHaveBeenCalledTimes(1);
    expect(orderRepository.approveOrderAndDecrementStock).toHaveBeenCalledWith('o1');
  });

  it('handles a rehydration query failure gracefully', async () => {
    const { service, orderRepository } = build();
    orderRepository.findPending.mockResolvedValue(
      err({ code: 'PERSISTENCE_ERROR', message: 'db down' }),
    );

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it('skips rehydration for orders without a linked provider transaction', async () => {
    const { service, orderRepository, paymentGateway } = build();
    orderRepository.findPending.mockResolvedValue(
      ok([makeOrder({ id: 'o1', providerTransactionId: undefined })]),
    );

    await service.onModuleInit();
    await jest.advanceTimersByTimeAsync(5000);

    expect(paymentGateway.getTransactionStatus).not.toHaveBeenCalled();
  });

  it('does not crash when approval finalization fails', async () => {
    const { service, orderRepository, paymentGateway } = build();
    paymentGateway.getTransactionStatus.mockResolvedValue(
      ok({ providerStatus: 'APPROVED', orderStatus: 'APPROVED' }),
    );
    orderRepository.approveOrderAndDecrementStock.mockResolvedValue(
      err({ code: 'OUT_OF_STOCK', message: 'no units left' }),
    );

    await service.start('o1', 'prov_1');
    await expect(jest.advanceTimersByTimeAsync(5000)).resolves.toBeUndefined();
  });

  it('retries when polling throws unexpectedly', async () => {
    const { service, orderRepository, paymentGateway } = build();
    paymentGateway.getTransactionStatus
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(ok({ providerStatus: 'APPROVED', orderStatus: 'APPROVED' }));
    orderRepository.approveOrderAndDecrementStock.mockResolvedValue(
      ok(makeOrder({ status: 'APPROVED' })),
    );

    await service.start('o1', 'prov_1');
    await jest.advanceTimersByTimeAsync(5000);
    await jest.advanceTimersByTimeAsync(5000);

    expect(paymentGateway.getTransactionStatus).toHaveBeenCalledTimes(2);
    expect(orderRepository.approveOrderAndDecrementStock).toHaveBeenCalledWith('o1');
  });

  it('clears active pollers on module destroy', async () => {
    const { service, paymentGateway } = build();
    paymentGateway.getTransactionStatus.mockResolvedValue(
      ok({ providerStatus: 'PENDING', orderStatus: 'PENDING' }),
    );

    await service.start('o1', 'prov_1');
    service.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(5000);

    expect(paymentGateway.getTransactionStatus).not.toHaveBeenCalled();
  });
});
