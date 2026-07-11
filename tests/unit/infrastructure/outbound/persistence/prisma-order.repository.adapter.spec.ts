import { PrismaOrderRepositoryAdapter } from '../../../../../src/infrastructure/adapters/outbound/persistence/prisma-order.repository.adapter';
import { PrismaService } from '../../../../../src/infrastructure/adapters/outbound/persistence/prisma.service';
import { Ok, Err } from '../../../../../src/shared/railway';
import { AppError } from '../../../../../src/shared/errors';
import { Order } from '../../../../../src/domain/entities';

const orderRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'o1',
  productId: 'p1',
  customerId: 'c1',
  quantity: 2,
  baseFeeInCents: 0,
  deliveryFeeInCents: 0,
  taxRatePercent: 18,
  taxInCents: 3051,
  amountInCents: 20000,
  currency: 'COP',
  status: 'PENDING',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  customer: { email: 'buyer@example.com' },
  transaction: { providerTransactionId: null },
  delivery: null,
  ...overrides,
});

const build = () => {
  const order = {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  };
  const tx = {
    order: { findUnique: jest.fn(), update: jest.fn() },
    product: { updateMany: jest.fn() },
  };
  const prisma = {
    order,
    $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
  } as unknown as PrismaService;

  return { adapter: new PrismaOrderRepositoryAdapter(prisma), order, tx };
};

describe('PrismaOrderRepositoryAdapter', () => {
  it('creates a PENDING order and maps relations', async () => {
    const { adapter, order } = build();
    order.create.mockResolvedValue(orderRow());

    const result = await adapter.createPending({
      productId: 'p1',
      customerId: 'c1',
      quantity: 2,
      baseFeeInCents: 0,
      deliveryFeeInCents: 0,
      taxRatePercent: 18,
      taxInCents: 3051,
      amountInCents: 20000,
      currency: 'COP',
    });

    const value = (result as Ok<Order>).value;
    expect(value.status).toBe('PENDING');
    expect(value.customerEmail).toBe('buyer@example.com');
    expect(value.taxRatePercent).toBe(18);
    expect(value.taxInCents).toBe(3051);
  });

  it('findById returns null when absent', async () => {
    const { adapter, order } = build();
    order.findUnique.mockResolvedValue(null);

    const result = await adapter.findById('missing');

    expect((result as Ok<Order | null>).value).toBeNull();
  });

  it('findPending maps a list', async () => {
    const { adapter, order } = build();
    order.findMany.mockResolvedValue([orderRow(), orderRow({ id: 'o2' })]);

    const result = await adapter.findPending();

    expect((result as Ok<Order[]>).value).toHaveLength(2);
  });

  it('maps a linked transaction and full delivery relations', async () => {
    const { adapter, order } = build();
    order.findUnique.mockResolvedValue(
      orderRow({
        transaction: { providerTransactionId: 'prov_9' },
        delivery: {
          fullName: 'Ada',
          email: 'buyer@example.com',
          phone: '+573001112233',
          address1: 'Calle 1',
          address2: 'Apto 2',
          city: 'Bogotá',
          state: 'Cundinamarca',
          zip: '110111',
          country: 'CO',
        },
      }),
    );

    const value = (await adapter.findById('o1')) as Ok<Order | null>;
    const order1 = value.value as Order;

    expect(order1.providerTransactionId).toBe('prov_9');
    expect(order1.shippingData).toMatchObject({
      fullName: 'Ada',
      address2: 'Apto 2',
      country: 'CO',
    });
  });

  it('updates the order status', async () => {
    const { adapter, order } = build();
    order.update.mockResolvedValue(orderRow({ status: 'DECLINED' }));

    const result = await adapter.updateStatus('o1', 'DECLINED');

    expect((result as Ok<Order>).value.status).toBe('DECLINED');
  });

  it('wraps createPending errors as PERSISTENCE_ERROR', async () => {
    const { adapter, order } = build();
    order.create.mockRejectedValue(new Error('db down'));

    const result = await adapter.createPending({
      productId: 'p1',
      customerId: 'c1',
      quantity: 1,
      baseFeeInCents: 0,
      deliveryFeeInCents: 0,
      taxRatePercent: 18,
      taxInCents: 153,
      amountInCents: 1000,
      currency: 'COP',
    });

    expect((result as Err<AppError>).error.code).toBe('PERSISTENCE_ERROR');
  });

  describe('approveOrderAndDecrementStock', () => {
    it('decrements stock and approves the order atomically', async () => {
      const { adapter, tx } = build();
      tx.order.findUnique.mockResolvedValue({
        id: 'o1',
        productId: 'p1',
        status: 'PENDING',
        quantity: 2,
      });
      tx.product.updateMany.mockResolvedValue({ count: 1 });
      tx.order.update.mockResolvedValue(orderRow({ status: 'APPROVED' }));

      const result = await adapter.approveOrderAndDecrementStock('o1');

      expect((result as Ok<Order>).value.status).toBe('APPROVED');
      expect(tx.product.updateMany).toHaveBeenCalledWith({
        where: { id: 'p1', stock: { gte: 2 } },
        data: { stock: { decrement: 2 } },
      });
    });

    it('is idempotent when the order is already finalized', async () => {
      const { adapter, tx } = build();
      tx.order.findUnique
        .mockResolvedValueOnce({ id: 'o1', productId: 'p1', status: 'APPROVED', quantity: 2 })
        .mockResolvedValueOnce(orderRow({ status: 'APPROVED' }));

      const result = await adapter.approveOrderAndDecrementStock('o1');

      expect((result as Ok<Order>).value.status).toBe('APPROVED');
      expect(tx.product.updateMany).not.toHaveBeenCalled();
    });

    it('returns OUT_OF_STOCK when no stock could be decremented', async () => {
      const { adapter, tx } = build();
      tx.order.findUnique.mockResolvedValue({
        id: 'o1',
        productId: 'p1',
        status: 'PENDING',
        quantity: 99,
      });
      tx.product.updateMany.mockResolvedValue({ count: 0 });

      const result = await adapter.approveOrderAndDecrementStock('o1');

      expect((result as Err<AppError>).error.code).toBe('OUT_OF_STOCK');
    });

    it('returns ORDER_NOT_FOUND when the order does not exist', async () => {
      const { adapter, tx } = build();
      tx.order.findUnique.mockResolvedValue(null);

      const result = await adapter.approveOrderAndDecrementStock('missing');

      expect((result as Err<AppError>).error.code).toBe('ORDER_NOT_FOUND');
    });

    it('wraps unexpected errors as PERSISTENCE_ERROR', async () => {
      const { adapter, tx } = build();
      tx.order.findUnique.mockRejectedValue(new Error('db down'));

      const result = await adapter.approveOrderAndDecrementStock('o1');

      expect((result as Err<AppError>).error.code).toBe('PERSISTENCE_ERROR');
    });
  });
});
