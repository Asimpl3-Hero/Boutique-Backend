import { Transaction, OrderStatus } from '../../entities';
import { AppError } from '../../../shared/errors';
import { Result } from '../../../shared/railway';

export const TRANSACTION_REPOSITORY_PORT = Symbol('TRANSACTION_REPOSITORY_PORT');

export interface CreateTransactionInput {
  orderId: string;
  providerTransactionId?: string;
}

export interface TransactionRepositoryPort {
  create(input: CreateTransactionInput): Promise<Result<Transaction, AppError>>;
  findByOrderId(orderId: string): Promise<Result<Transaction | null, AppError>>;
  linkProviderTransaction(
    orderId: string,
    providerTransactionId: string,
  ): Promise<Result<Transaction, AppError>>;
  updateStatus(
    orderId: string,
    status: OrderStatus,
  ): Promise<Result<Transaction, AppError>>;
}
