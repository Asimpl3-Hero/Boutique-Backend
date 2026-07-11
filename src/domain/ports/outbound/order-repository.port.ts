import { Order, OrderStatus } from '../../entities';
import { AppError } from '../../../shared/errors';
import { Result } from '../../../shared/railway';

export const ORDER_REPOSITORY_PORT = Symbol('ORDER_REPOSITORY_PORT');

export interface CreatePendingOrderInput {
  productId: string;
  customerId: string;
  quantity: number;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  taxRatePercent: number;
  taxInCents: number;
  amountInCents: number;
  currency: string;
}

export interface OrderRepositoryPort {
  createPending(
    input: CreatePendingOrderInput,
  ): Promise<Result<Order, AppError>>;
  findById(id: string): Promise<Result<Order | null, AppError>>;
  findByCustomerId(customerId: string): Promise<Result<Order[], AppError>>;
  findPending(): Promise<Result<Order[], AppError>>;
  approveOrderAndDecrementStock(id: string): Promise<Result<Order, AppError>>;
  updateStatus(
    id: string,
    status: OrderStatus,
  ): Promise<Result<Order, AppError>>;
}
