import { Inject, Injectable } from '@nestjs/common';
import { PRODUCT_REPOSITORY_PORT } from '../../domain/ports';
import type { ProductRepositoryPort } from '../../domain/ports';
import { Product } from '../../domain/entities';
import { AppError } from '../../shared/errors';
import { Result } from '../../shared/railway';

@Injectable()
export class GetProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  public execute(): Promise<Result<Product[], AppError>> {
    return this.productRepository.findAll();
  }
}
