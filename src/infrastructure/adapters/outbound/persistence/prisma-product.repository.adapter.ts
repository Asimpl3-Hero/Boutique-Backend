import { Injectable } from '@nestjs/common';
import { Product } from '../../../../domain/entities';
import type { ProductRepositoryPort } from '../../../../domain/ports';
import { AppError } from '../../../../shared/errors';
import { Result, err, ok } from '../../../../shared/railway';
import { PrismaService } from './prisma.service';
import { toProductEntity } from './prisma-product.mapper';

@Injectable()
export class PrismaProductRepositoryAdapter implements ProductRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  public async findAll(): Promise<Result<Product[], AppError>> {
    try {
      const rows = await this.prisma.product.findMany({
        orderBy: { createdAt: 'asc' },
      });

      return ok(rows.map(toProductEntity));
    } catch (cause) {
      return err({
        code: 'PERSISTENCE_ERROR',
        message: 'Failed to fetch products.',
        details: cause,
      });
    }
  }

  public async findById(id: string): Promise<Result<Product | null, AppError>> {
    try {
      const row = await this.prisma.product.findUnique({ where: { id } });

      return ok(row ? toProductEntity(row) : null);
    } catch (cause) {
      return err({
        code: 'PERSISTENCE_ERROR',
        message: 'Failed to fetch product by id.',
        details: cause,
      });
    }
  }

  public async decrementStock(
    productId: string,
    units: number,
  ): Promise<Result<void, AppError>> {
    try {
      const updated = await this.prisma.product.updateMany({
        where: { id: productId, stock: { gte: units } },
        data: { stock: { decrement: units } },
      });

      if (updated.count === 0) {
        return err({
          code: 'OUT_OF_STOCK',
          message: `Product ${productId} does not have enough stock.`,
        });
      }

      return ok(undefined);
    } catch (cause) {
      return err({
        code: 'PERSISTENCE_ERROR',
        message: 'Failed to decrement product stock.',
        details: cause,
      });
    }
  }
}
