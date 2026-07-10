import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CreateOrderUseCase } from '../../../../application/use-cases/create-order.use-case';
import { GetOrderByIdUseCase } from '../../../../application/use-cases/get-order-by-id.use-case';
import { CreateOrderRequestDto } from '../../../../application/dto/create-order-request.dto';
import { OrderCreatedResponseDto } from '../../../../application/dto/order-created-response.dto';
import {
  OrderResponseDto,
  toOrderResponse,
} from '../../../../application/dto/order-response.dto';
import { toHttpException } from './http-error.mapper';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getOrderByIdUseCase: GetOrderByIdUseCase,
  ) {}

  @Post()
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
