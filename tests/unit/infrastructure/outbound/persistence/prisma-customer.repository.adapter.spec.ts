import { PrismaCustomerRepositoryAdapter } from '../../../../../src/infrastructure/adapters/outbound/persistence/prisma-customer.repository.adapter';
import { PrismaService } from '../../../../../src/infrastructure/adapters/outbound/persistence/prisma.service';
import { Ok, Err } from '../../../../../src/shared/railway';
import { AppError } from '../../../../../src/shared/errors';
import { Customer } from '../../../../../src/domain/entities';

const row = {
  id: 'c1',
  email: 'buyer@example.com',
  fullName: 'Ada',
  phone: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const build = () => {
  const customer = { upsert: jest.fn(), findUnique: jest.fn() };
  const prisma = { customer } as unknown as PrismaService;
  return { adapter: new PrismaCustomerRepositoryAdapter(prisma), customer };
};

describe('PrismaCustomerRepositoryAdapter', () => {
  it('upserts and maps the customer (phone null -> undefined)', async () => {
    const { adapter, customer } = build();
    customer.upsert.mockResolvedValue(row);

    const result = await adapter.upsert({ email: row.email, fullName: 'Ada' });

    expect((result as Ok<Customer>).value.phone).toBeUndefined();
    expect((result as Ok<Customer>).value.email).toBe('buyer@example.com');
  });

  it('wraps upsert errors as PERSISTENCE_ERROR', async () => {
    const { adapter, customer } = build();
    customer.upsert.mockRejectedValue(new Error('boom'));

    const result = await adapter.upsert({ email: 'x', fullName: 'y' });

    expect((result as Err<AppError>).error.code).toBe('PERSISTENCE_ERROR');
  });

  it('findByEmail returns null when absent', async () => {
    const { adapter, customer } = build();
    customer.findUnique.mockResolvedValue(null);

    const result = await adapter.findByEmail('missing@example.com');

    expect((result as Ok<Customer | null>).value).toBeNull();
  });

  it('findByEmail wraps errors as PERSISTENCE_ERROR', async () => {
    const { adapter, customer } = build();
    customer.findUnique.mockRejectedValue(new Error('boom'));

    const result = await adapter.findByEmail('x');

    expect((result as Err<AppError>).error.code).toBe('PERSISTENCE_ERROR');
  });
});
