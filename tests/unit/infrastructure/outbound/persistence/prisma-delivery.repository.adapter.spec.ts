import { PrismaDeliveryRepositoryAdapter } from '../../../../../src/infrastructure/adapters/outbound/persistence/prisma-delivery.repository.adapter';
import { PrismaService } from '../../../../../src/infrastructure/adapters/outbound/persistence/prisma.service';
import { Ok, Err } from '../../../../../src/shared/railway';
import { AppError } from '../../../../../src/shared/errors';
import { Delivery } from '../../../../../src/domain/entities';
import { makeShippingData } from '../../../../helpers/factories/order.factory';

const row = {
  id: 'd1',
  orderId: 'o1',
  fullName: 'Ada',
  email: 'buyer@example.com',
  phone: null,
  address1: 'Calle 1',
  address2: null,
  city: 'Bogotá',
  state: 'Cundinamarca',
  zip: '110111',
  country: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const build = () => {
  const delivery = { create: jest.fn(), findUnique: jest.fn() };
  const prisma = { delivery } as unknown as PrismaService;
  return { adapter: new PrismaDeliveryRepositoryAdapter(prisma), delivery };
};

describe('PrismaDeliveryRepositoryAdapter', () => {
  it('creates a delivery and maps nulls to undefined', async () => {
    const { adapter, delivery } = build();
    delivery.create.mockResolvedValue(row);

    const result = await adapter.create({
      orderId: 'o1',
      shippingData: makeShippingData(),
    });

    const value = (result as Ok<Delivery>).value;
    expect(value.phone).toBeUndefined();
    expect(value.country).toBeUndefined();
    expect(value.city).toBe('Bogotá');
  });

  it('wraps create errors as PERSISTENCE_ERROR', async () => {
    const { adapter, delivery } = build();
    delivery.create.mockRejectedValue(new Error('boom'));

    const result = await adapter.create({
      orderId: 'o1',
      shippingData: makeShippingData(),
    });

    expect((result as Err<AppError>).error.code).toBe('PERSISTENCE_ERROR');
  });

  it('findByOrderId returns null when absent', async () => {
    const { adapter, delivery } = build();
    delivery.findUnique.mockResolvedValue(null);

    const result = await adapter.findByOrderId('missing');

    expect((result as Ok<Delivery | null>).value).toBeNull();
  });
});
