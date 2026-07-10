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
  APP_ERROR_SCHEMA,
  CREATE_ORDER_REQUEST_SCHEMA,
  ORDER_CREATED_RESPONSE_SCHEMA,
  ORDER_RESPONSE_SCHEMA,
} from './docs/swagger.schemas';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getOrderByIdUseCase: GetOrderByIdUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create an order and start the payment',
    description:
      'Creates a PENDING order, charges the payment provider and starts background status polling.',
  })
  @ApiBody({ schema: CREATE_ORDER_REQUEST_SCHEMA })
  @ApiCreatedResponse({
    description: 'Order created; polling started.',
    schema: ORDER_CREATED_RESPONSE_SCHEMA,
  })
  @ApiBadRequestResponse({
    description: 'Invalid payload or missing card token (VALIDATION_ERROR).',
    schema: APP_ERROR_SCHEMA,
  })
  @ApiNotFoundResponse({
    description: 'Product not found (PRODUCT_NOT_FOUND).',
    schema: APP_ERROR_SCHEMA,
  })
  @ApiConflictResponse({
    description: 'Insufficient stock (OUT_OF_STOCK).',
    schema: APP_ERROR_SCHEMA,
  })
  @ApiBadGatewayResponse({
    description: 'Payment provider error (PAYMENT_PROVIDER_ERROR).',
    schema: APP_ERROR_SCHEMA,
  })
  @ApiInternalServerErrorResponse({
    description: 'Persistence or polling error.',
    schema: APP_ERROR_SCHEMA,
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
    summary: 'Get an order by id',
    description: 'Returns the current order status and data.',
  })
  @ApiParam({ name: 'id', description: 'Order UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'Order found.', schema: ORDER_RESPONSE_SCHEMA })
  @ApiBadRequestResponse({
    description: 'Malformed order id.',
    schema: APP_ERROR_SCHEMA,
  })
  @ApiNotFoundResponse({
    description: 'Order not found (ORDER_NOT_FOUND).',
    schema: APP_ERROR_SCHEMA,
  })
  @ApiInternalServerErrorResponse({
    description: 'Persistence error.',
    schema: APP_ERROR_SCHEMA,
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
