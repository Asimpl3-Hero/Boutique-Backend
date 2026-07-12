import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateOrderUseCase } from '../../../../application/use-cases/create-order.use-case';
import { GetOrderByIdUseCase } from '../../../../application/use-cases/get-order-by-id.use-case';
import { CreateOrderRequestDto } from '../../../../application/dto/create-order-request.dto';
import { OrderCreatedResponseDto } from '../../../../application/dto/order-created-response.dto';
import {
  OrderResponseDto,
  toOrderResponse,
} from '../../../../application/dto/order-response.dto';
import { toHttpException } from './http-error.mapper';
import {
  appErrorSchema,
  CREATE_ORDER_REQUEST_SCHEMA,
  ORDER_CREATED_RESPONSE_SCHEMA,
  ORDER_RESPONSE_SCHEMA,
} from './docs/swagger.schemas';

@ApiTags('Órdenes')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getOrderByIdUseCase: GetOrderByIdUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Crear una orden e iniciar el pago',
    description:
      'Crea la orden en estado <span style="color:#F6C445;font-weight:bold">PENDING</span> (una orden = <span style="color:#4F6BD8;font-weight:bold">un producto</span>), calcula el total como base + <span style="color:#4F6BD8;font-weight:bold">IVA</span>, cobra al <span style="color:#4F6BD8;font-weight:bold">proveedor de pagos</span> con el token de la tarjeta e inicia el <span style="color:#4F6BD8;font-weight:bold">polling</span> en segundo plano que resolverá el estado final. La respuesta es inmediata; el resultado se consulta con <span style="color:#4F6BD8;font-weight:bold">GET /orders/:id</span>.',
  })
  @ApiBody({ schema: CREATE_ORDER_REQUEST_SCHEMA })
  @ApiCreatedResponse({
    description: 'Orden creada y <span style="color:#4F6BD8;font-weight:bold">polling</span> iniciado.',
    schema: ORDER_CREATED_RESPONSE_SCHEMA,
  })
  @ApiBadRequestResponse({
    description: 'Payload inválido o token de tarjeta ausente (<span style="color:#E5484D;font-weight:bold">VALIDATION_ERROR</span>).',
    schema: appErrorSchema(
      'VALIDATION_ERROR',
      'CARD payment requires paymentMethodData.cardToken.',
    ),
  })
  @ApiNotFoundResponse({
    description: 'Producto no encontrado (<span style="color:#E5484D;font-weight:bold">PRODUCT_NOT_FOUND</span>).',
    schema: appErrorSchema(
      'PRODUCT_NOT_FOUND',
      'Product cedb6f47-d731-4ff9-8aa7-347948e123d8 was not found.',
    ),
  })
  @ApiConflictResponse({
    description: 'Stock insuficiente para la cantidad pedida (<span style="color:#E5484D;font-weight:bold">OUT_OF_STOCK</span>).',
    schema: appErrorSchema(
      'OUT_OF_STOCK',
      'Product cedb6f47-d731-4ff9-8aa7-347948e123d8 does not have enough stock for quantity 3.',
    ),
  })
  @ApiBadGatewayResponse({
    description: 'Error del proveedor de pagos (<span style="color:#E5484D;font-weight:bold">PAYMENT_PROVIDER_ERROR</span>).',
    schema: appErrorSchema(
      'PAYMENT_PROVIDER_ERROR',
      'The payment provider rejected the transaction request.',
    ),
  })
  @ApiInternalServerErrorResponse({
    description: 'Error de persistencia o de polling (<span style="color:#E5484D;font-weight:bold">PERSISTENCE_ERROR</span> / <span style="color:#E5484D;font-weight:bold">POLLING_ERROR</span>).',
    schema: appErrorSchema('PERSISTENCE_ERROR', 'Failed to create order.'),
  })
  public async createOrder(
    @Body() body: CreateOrderRequestDto,
  ): Promise<OrderCreatedResponseDto> {
    const result = await this.createOrderUseCase.execute({
      productId: body.productId,
      quantity: body.quantity,
      customerEmail: body.customerEmail,
      shippingData: body.shippingData,
      paymentMethodData: body.paymentMethodData,
    });

    return result.match(
      (created) => created,
      (error) => {
        throw toHttpException(error);
      },
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar una orden por id',
    description:
      'Devuelve la orden con su estado actual — <span style="color:#F6C445;font-weight:bold">PENDING</span>, <span style="color:#2E9E6B;font-weight:bold">APPROVED</span> o <span style="color:#E5484D;font-weight:bold">DECLINED</span> — más el desglose de <span style="color:#4F6BD8;font-weight:bold">IVA</span>, tarifas, datos de envío y el id de la transacción del proveedor. Es el endpoint que la app consulta en <span style="color:#4F6BD8;font-weight:bold">polling</span> hasta el estado terminal.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la orden', format: 'uuid' })
  @ApiOkResponse({ description: 'Orden encontrada.', schema: ORDER_RESPONSE_SCHEMA })
  @ApiBadRequestResponse({
    description: 'Id de orden malformado (no es un UUID).',
    schema: appErrorSchema('VALIDATION_ERROR', 'Validation failed (uuid is expected).'),
  })
  @ApiNotFoundResponse({
    description: 'Orden no encontrada (<span style="color:#E5484D;font-weight:bold">ORDER_NOT_FOUND</span>).',
    schema: appErrorSchema(
      'ORDER_NOT_FOUND',
      'Order 5b3f2c1a-9d84-4a1e-b7c6-0f2d9a8e6c41 was not found.',
    ),
  })
  @ApiInternalServerErrorResponse({
    description: 'Error de persistencia (<span style="color:#E5484D;font-weight:bold">PERSISTENCE_ERROR</span>).',
    schema: appErrorSchema('PERSISTENCE_ERROR', 'Failed to fetch order by id.'),
  })
  public async getOrderById(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<OrderResponseDto> {
    const result = await this.getOrderByIdUseCase.execute(id);

    return result.match(
      (order) => toOrderResponse(order),
      (error) => {
        throw toHttpException(error);
      },
    );
  }
}
