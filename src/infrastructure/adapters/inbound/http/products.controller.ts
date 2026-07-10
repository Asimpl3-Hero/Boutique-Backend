import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { GetProductsUseCase } from '../../../../application/use-cases/get-products.use-case';
import { GetProductByIdUseCase } from '../../../../application/use-cases/get-product-by-id.use-case';
import {
  ProductResponseDto,
  toProductResponse,
} from '../../../../application/dto/product-response.dto';
import { toHttpException } from './http-error.mapper';
import {
  APP_ERROR_SCHEMA,
  PRODUCTS_RESPONSE_SCHEMA,
  PRODUCT_RESPONSE_SCHEMA,
} from './docs/swagger.schemas';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly getProductsUseCase: GetProductsUseCase,
    private readonly getProductByIdUseCase: GetProductByIdUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List products',
    description: 'Returns the full catalog with price, stock and currency.',
  })
  @ApiOkResponse({
    description: 'Catalog returned.',
    schema: PRODUCTS_RESPONSE_SCHEMA,
  })
  @ApiInternalServerErrorResponse({
    description: 'Persistence error.',
    schema: APP_ERROR_SCHEMA,
  })
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
  @ApiOperation({
    summary: 'Get a product by id',
    description: 'Returns a single product by its identifier.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'Product found.', schema: PRODUCT_RESPONSE_SCHEMA })
  @ApiNotFoundResponse({
    description: 'Product not found (PRODUCT_NOT_FOUND).',
    schema: APP_ERROR_SCHEMA,
  })
  @ApiInternalServerErrorResponse({
    description: 'Persistence error.',
    schema: APP_ERROR_SCHEMA,
  })
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
