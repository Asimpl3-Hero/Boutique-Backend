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
import { AppConfigService } from '../../../config/app-config.service';
import { toHttpException } from './http-error.mapper';
import {
  appErrorSchema,
  PRODUCTS_RESPONSE_SCHEMA,
  PRODUCT_RESPONSE_SCHEMA,
} from './docs/swagger.schemas';

@ApiTags('Productos')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly getProductsUseCase: GetProductsUseCase,
    private readonly getProductByIdUseCase: GetProductByIdUseCase,
    private readonly appConfig: AppConfigService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar productos',
    description:
      'Devuelve el catálogo completo: <span style="color:#4F6BD8;font-weight:bold">precio base</span> en centavos (sin IVA), <span style="color:#4F6BD8;font-weight:bold">stock</span> disponible, moneda y la <span style="color:#4F6BD8;font-weight:bold">tasa de IVA</span> que se aplicará al pagar.',
  })
  @ApiOkResponse({
    description: 'Catálogo devuelto.',
    schema: PRODUCTS_RESPONSE_SCHEMA,
  })
  @ApiInternalServerErrorResponse({
    description: 'Error de persistencia (<span style="color:#E5484D;font-weight:bold">PERSISTENCE_ERROR</span>).',
    schema: appErrorSchema('PERSISTENCE_ERROR', 'Failed to fetch products.'),
  })
  public async getProducts(): Promise<ProductResponseDto[]> {
    const result = await this.getProductsUseCase.execute();

    return result.match(
      (products) =>
        products.map((product) =>
          toProductResponse(product, this.appConfig.taxRatePercent),
        ),
      (error) => {
        throw toHttpException(error);
      },
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un producto por id',
    description:
      'Devuelve un producto puntual por su <span style="color:#4F6BD8;font-weight:bold">UUID</span>, con los mismos campos del listado.',
  })
  @ApiParam({ name: 'id', description: 'UUID del producto', format: 'uuid' })
  @ApiOkResponse({ description: 'Producto encontrado.', schema: PRODUCT_RESPONSE_SCHEMA })
  @ApiNotFoundResponse({
    description: 'Producto no encontrado (<span style="color:#E5484D;font-weight:bold">PRODUCT_NOT_FOUND</span>).',
    schema: appErrorSchema(
      'PRODUCT_NOT_FOUND',
      'Product cedb6f47-d731-4ff9-8aa7-347948e123d8 was not found.',
    ),
  })
  @ApiInternalServerErrorResponse({
    description: 'Error de persistencia (<span style="color:#E5484D;font-weight:bold">PERSISTENCE_ERROR</span>).',
    schema: appErrorSchema('PERSISTENCE_ERROR', 'Failed to fetch product by id.'),
  })
  public async getProductById(
    @Param('id') id: string,
  ): Promise<ProductResponseDto> {
    const result = await this.getProductByIdUseCase.execute(id);

    return result.match(
      (product) =>
        toProductResponse(product, this.appConfig.taxRatePercent),
      (error) => {
        throw toHttpException(error);
      },
    );
  }
}
