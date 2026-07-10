import { PrismaProductRepositoryAdapter } from '../../../../../src/infrastructure/adapters/outbound/persistence/prisma-product.repository.adapter';
import { PrismaService } from '../../../../../src/infrastructure/adapters/outbound/persistence/prisma.service';
import { Ok, Err } from '../../../../../src/shared/railway';
import { AppError } from '../../../../../src/shared/errors';
import { Product } from '../../../../../src/domain/entities';

interface ProductDelegateMock {
  findMany: jest.Mock;
  findUnique: jest.Mock;
  updateMany: jest.Mock;
}

const buildPrismaMock = (): { prisma: PrismaService; product: ProductDelegateMock } => {
  const product: ProductDelegateMock = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  };

  return { prisma: { product } as unknown as PrismaService, product };
};

const prismaRow = {
  id: 'p1',
  name: 'Linen Shirt',
  description: 'A shirt',
  priceInCents: 1000,
  imageUrl: 'https://example.com/p.png',
  stock: 5,
  currency: 'COP',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('PrismaProductRepositoryAdapter', () => {
  describe('findAll', () => {
    it('maps Prisma rows to domain products', async () => {
      const { prisma, product } = buildPrismaMock();
      product.findMany.mockResolvedValue([prismaRow]);
      const adapter = new PrismaProductRepositoryAdapter(prisma);

      const result = await adapter.findAll();

      const products = (result as Ok<Product[]>).value;
      expect(products).toEqual([
        {
          id: 'p1',
          name: 'Linen Shirt',
          description: 'A shirt',
          priceInCents: 1000,
          imageUrl: 'https://example.com/p.png',
          stock: 5,
          currency: 'COP',
          createdAt: prismaRow.createdAt,
        },
      ]);
    });

    it('wraps errors as PERSISTENCE_ERROR', async () => {
      const { prisma, product } = buildPrismaMock();
      product.findMany.mockRejectedValue(new Error('db down'));
      const adapter = new PrismaProductRepositoryAdapter(prisma);

      const result = await adapter.findAll();

      expect((result as Err<AppError>).error.code).toBe('PERSISTENCE_ERROR');
    });
  });

  describe('findById', () => {
    it('returns the mapped product when found', async () => {
      const { prisma, product } = buildPrismaMock();
      product.findUnique.mockResolvedValue(prismaRow);
      const adapter = new PrismaProductRepositoryAdapter(prisma);

      const result = await adapter.findById('p1');

      expect((result as Ok<Product | null>).value?.id).toBe('p1');
    });

    it('returns null when not found', async () => {
      const { prisma, product } = buildPrismaMock();
      product.findUnique.mockResolvedValue(null);
      const adapter = new PrismaProductRepositoryAdapter(prisma);

      const result = await adapter.findById('missing');

      expect((result as Ok<Product | null>).value).toBeNull();
    });

    it('wraps errors as PERSISTENCE_ERROR', async () => {
      const { prisma, product } = buildPrismaMock();
      product.findUnique.mockRejectedValue(new Error('boom'));
      const adapter = new PrismaProductRepositoryAdapter(prisma);

      const result = await adapter.findById('p1');

      expect((result as Err<AppError>).error.code).toBe('PERSISTENCE_ERROR');
    });
  });

  describe('decrementStock', () => {
    it('succeeds when a row was updated', async () => {
      const { prisma, product } = buildPrismaMock();
      product.updateMany.mockResolvedValue({ count: 1 });
      const adapter = new PrismaProductRepositoryAdapter(prisma);

      const result = await adapter.decrementStock('p1', 2);

      expect(result.isOk()).toBe(true);
      expect(product.updateMany).toHaveBeenCalledWith({
        where: { id: 'p1', stock: { gte: 2 } },
        data: { stock: { decrement: 2 } },
      });
    });

    it('returns OUT_OF_STOCK when no row matched', async () => {
      const { prisma, product } = buildPrismaMock();
      product.updateMany.mockResolvedValue({ count: 0 });
      const adapter = new PrismaProductRepositoryAdapter(prisma);

      const result = await adapter.decrementStock('p1', 99);

      expect((result as Err<AppError>).error.code).toBe('OUT_OF_STOCK');
    });

    it('wraps errors as PERSISTENCE_ERROR', async () => {
      const { prisma, product } = buildPrismaMock();
      product.updateMany.mockRejectedValue(new Error('boom'));
      const adapter = new PrismaProductRepositoryAdapter(prisma);

      const result = await adapter.decrementStock('p1', 1);

      expect((result as Err<AppError>).error.code).toBe('PERSISTENCE_ERROR');
    });
  });
});
