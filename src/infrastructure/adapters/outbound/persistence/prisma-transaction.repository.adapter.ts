import { Injectable } from '@nestjs/common';
import type { Transaction as PrismaTransaction } from '@prisma/client';
import type { Transaction, OrderStatus } from '../../../../domain/entities';
import type {
  CreateTransactionInput,
  TransactionRepositoryPort,
} from '../../../../domain/ports';
import { AppError } from '../../../../shared/errors';
import { Result, err, ok } from '../../../../shared/railway';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaTransactionRepositoryAdapter
  implements TransactionRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  public async create(
    input: CreateTransactionInput,
  ): Promise<Result<Transaction, AppError>> {
    try {
      const transaction = await this.prisma.transaction.create({
        data: {
          orderId: input.orderId,
          providerTransactionId: input.providerTransactionId ?? null,
          status: 'PENDING',
        },
      });

      return ok(this.toDomain(transaction));
    } catch (cause) {
      return err({
        code: 'PERSISTENCE_ERROR',
        message: 'Failed to create transaction.',
        details: cause,
      });
    }
  }

  public async findByOrderId(
    orderId: string,
  ): Promise<Result<Transaction | null, AppError>> {
    try {
      const transaction = await this.prisma.transaction.findUnique({
        where: { orderId },
      });

      return ok(transaction ? this.toDomain(transaction) : null);
    } catch (cause) {
      return err({
        code: 'PERSISTENCE_ERROR',
        message: 'Failed to fetch transaction by order id.',
        details: cause,
      });
    }
  }

  public async linkProviderTransaction(
    orderId: string,
    providerTransactionId: string,
  ): Promise<Result<Transaction, AppError>> {
    try {
      const transaction = await this.prisma.transaction.update({
        where: { orderId },
        data: { providerTransactionId },
      });

      return ok(this.toDomain(transaction));
    } catch (cause) {
      return err({
        code: 'PERSISTENCE_ERROR',
        message: 'Failed to link provider transaction id.',
        details: cause,
      });
    }
  }

  public async updateStatus(
    orderId: string,
    status: OrderStatus,
  ): Promise<Result<Transaction, AppError>> {
    try {
      const transaction = await this.prisma.transaction.update({
        where: { orderId },
        data: { status },
      });

      return ok(this.toDomain(transaction));
    } catch (cause) {
      return err({
        code: 'PERSISTENCE_ERROR',
        message: 'Failed to update transaction status.',
        details: cause,
      });
    }
  }

  private toDomain(record: PrismaTransaction): Transaction {
    return {
      id: record.id,
      orderId: record.orderId,
      providerTransactionId: record.providerTransactionId,
      status: record.status as OrderStatus,
      createdAt: record.createdAt,
    };
  }
}
