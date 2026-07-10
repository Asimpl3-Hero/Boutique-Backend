import { HttpException } from '@nestjs/common';
import { OrdersController } from '../../../../../src/infrastructure/adapters/inbound/http/orders.controller';
import { CreateOrderUseCase } from '../../../../../src/application/use-cases/create-order.use-case';
import { GetOrderByIdUseCase } from '../../../../../src/application/use-cases/get-order-by-id.use-case';
import { CreateOrderRequestDto } from '../../../../../src/application/dto/create-order-request.dto';
import { ok, err } from '../../../../../src/shared/railway';
import { makeOrder, makeShippingData } from '../../../../helpers/factories/order.factory';

const buildController = () => {
  const createOrder = { execute: jest.fn() };
  const getOrderById = { execute: jest.fn() };
  const controller = new OrdersController(
    createOrder as unknown as CreateOrderUseCase,
    getOrderById as unknown as GetOrderByIdUseCase,
  );
  return { controller, createOrder, getOrderById };
};

const body: CreateOrderRequestDto = {
  productId: '11111111-1111-1111-1111-111111111111',
  quantity: 1,
  customerEmail: 'buyer@example.com',
  shippingData: makeShippingData(),
  paymentMethodData: { cardToken: 'tok_123' },
};

describe('OrdersController', () => {
  describe('POST /orders', () => {
    it('returns the created order payload', async () => {
      const { controller, createOrder } = buildController();
      createOrder.execute.mockResolvedValue(
        ok({ orderId: 'o1', checkoutUrl: null, status: 'PENDING' }),
      );

      const response = await controller.createOrder(body);

      expect(response).toEqual({ orderId: 'o1', checkoutUrl: null, status: 'PENDING' });
      expect(createOrder.execute).toHaveBeenCalledWith({
        productId: body.productId,
        quantity: body.quantity,
        customerEmail: body.customerEmail,
        shippingData: body.shippingData,
        paymentMethodData: body.paymentMethodData,
      });
    });

    it('maps errors to HttpException (400 on VALIDATION_ERROR)', async () => {
      const { controller, createOrder } = buildController();
      createOrder.execute.mockResolvedValue(
        err({ code: 'VALIDATION_ERROR', message: 'missing token' }),
      );

      await expect(controller.createOrder(body)).rejects.toMatchObject({
        status: 400,
      });
    });
  });

  describe('GET /orders/:id', () => {
    it('returns the mapped order', async () => {
      const { controller, getOrderById } = buildController();
      const order = makeOrder();
      getOrderById.execute.mockResolvedValue(ok(order));

      const response = await controller.getOrderById(order.id);

      expect(response.id).toBe(order.id);
      expect(response.status).toBe('PENDING');
      expect(response.providerTransactionId).toBeNull();
    });

    it('throws 404 when the order is not found', async () => {
      const { controller, getOrderById } = buildController();
      getOrderById.execute.mockResolvedValue(
        err({ code: 'ORDER_NOT_FOUND', message: 'nope' }),
      );

      await expect(
        controller.getOrderById('missing'),
      ).rejects.toBeInstanceOf(HttpException);
    });
  });
});
