import { Product } from '../../entities';
import { AppError } from '../../../shared/errors';
import { Result } from '../../../shared/railway';

export const PRODUCT_REPOSITORY_PORT = Symbol('PRODUCT_REPOSITORY_PORT');

export interface ProductRepositoryPort {
  findAll(): Promise<Result<Product[], AppError>>;
  findById(id: string): Promise<Result<Product | null, AppError>>;
  decrementStock(
    productId: string,
    units: number,
  ): Promise<Result<void, AppError>>;
}
