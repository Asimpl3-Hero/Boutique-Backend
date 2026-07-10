import { PrismaTransactionRepositoryAdapter } from '../../../../../src/infrastructure/adapters/outbound/persistence/prisma-transaction.repository.adapter';
import { PrismaService } from '../../../../../src/infrastructure/adapters/outbound/persistence/prisma.service';
import { Ok, Err } from '../../../../../src/shared/railway';
import { AppError } from '../../../../../src/shared/errors';
import { Transaction } from '../../../../../src/domain/entities';

const row = {
  id: 't1',
  orderId: 'o1',
  providerTransactionId: null,
  status: 'PENDING',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const build = () => {
  const transaction = {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  const prisma = { transaction } as unknown as PrismaService;
  return { adapter: new PrismaTransactionRepositoryAdapter(prisma), transaction };
};

describe('PrismaTransactionRepositoryAdapter', () => {
  it('creates a PENDING transaction', async () => {
    const { adapter, transaction } = build();
    transaction.create.mockResolvedValue(row);

    const result = await adapter.create({ orderId: 'o1' });

    expect((result as Ok<Transaction>).value.status).toBe('PENDING');
    expect(transaction.create).toHaveBeenCalledWith({
      data: { orderId: 'o1', providerTransactionId: null, status: 'PENDING' },
    });
  });

  it('links the provider transaction id', async () => {
    const { adapter, transaction } = build();
    transaction.update.mockResolvedValue({
      ...row,
      providerTransactionId: 'prov_1',
    });

    const result = await adapter.linkProviderTransaction('o1', 'prov_1');

    expect((result as Ok<Transaction>).value.providerTransactionId).toBe(
      'prov_1',
    );
    expect(transaction.update).toHaveBeenCalledWith({
      where: { orderId: 'o1' },
      data: { providerTransactionId: 'prov_1' },
    });
  });

  it('updates the transaction status', async () => {
    const { adapter, transaction } = build();
    transaction.update.mockResolvedValue({ ...row, status: 'APPROVED' });

    const result = await adapter.updateStatus('o1', 'APPROVED');

    expect((result as Ok<Transaction>).value.status).toBe('APPROVED');
  });

  it('wraps errors as PERSISTENCE_ERROR', async () => {
    const { adapter, transaction } = build();
    transaction.update.mockRejectedValue(new Error('boom'));

    const result = await adapter.updateStatus('o1', 'DECLINED');

    expect((result as Err<AppError>).error.code).toBe('PERSISTENCE_ERROR');
  });
});
