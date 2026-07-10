import { Inject, Injectable } from '@nestjs/common';
import { PRODUCT_REPOSITORY_PORT } from '../../domain/ports';
import type { ProductRepositoryPort } from '../../domain/ports';
import { Product } from '../../domain/entities';
import { AppError } from '../../shared/errors';
import { Result, err } from '../../shared/railway';

@Injectable()
export class GetProductByIdUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  public async execute(id: string): Promise<Result<Product, AppError>> {
    const result = await this.productRepository.findById(id);

    return result.flatMap((product) => {
      if (!product) {
        return err({
          code: 'PRODUCT_NOT_FOUND',
          message: `Product ${id} was not found.`,
        });
      }

      return Result.ok(product);
    });
  }
}
