import { Controller, Get, Param } from '@nestjs/common';
import { GetProductsUseCase } from '../../../../application/use-cases/get-products.use-case';
import { GetProductByIdUseCase } from '../../../../application/use-cases/get-product-by-id.use-case';
import {
  ProductResponseDto,
  toProductResponse,
} from '../../../../application/dto/product-response.dto';
import { toHttpException } from './http-error.mapper';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly getProductsUseCase: GetProductsUseCase,
    private readonly getProductByIdUseCase: GetProductByIdUseCase,
  ) {}

  @Get()
  public async getProducts(): Promise<ProductResponseDto[]> {
    const result = await this.getProductsUseCase.execute();

    return result.match(
      (products) => products.map(toProductResponse),
      (error) => {
        throw toHttpException(error);
      },
    );
  }

  @Get(':id')
  public async getProductById(
    @Param('id') id: string,
  ): Promise<ProductResponseDto> {
    const result = await this.getProductByIdUseCase.execute(id);

    return result.match(
      (product) => toProductResponse(product),
      (error) => {
        throw toHttpException(error);
      },
    );
  }
}
