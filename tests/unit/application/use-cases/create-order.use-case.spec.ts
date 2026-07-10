import {
  CreateOrderUseCase,
  CreateOrderInput,
} from '../../../../src/application/use-cases/create-order.use-case';
import { CreateOrderPaymentMethodResolver } from '../../../../src/application/services/create-order-payment-method.resolver';
import { AppConfigService } from '../../../../src/infrastructure/config/app-config.service';
import { Ok, Err, ok, err } from '../../../../src/shared/railway';
import { AppError } from '../../../../src/shared/errors';
import { OrderCreatedResponseDto } from '../../../../src/application/dto/order-created-response.dto';
import {
  createProductRepositoryMock,
  createOrderRepositoryMock,
  createCustomerRepositoryMock,
  createTransactionRepositoryMock,
  createDeliveryRepositoryMock,
  createPaymentGatewayMock,
  createOrderStatusPollingMock,
} from '../../../helpers/mocks/ports.mock';
import { makeProduct } from '../../../helpers/factories/product.factory';
import { makeCustomer } from '../../../helpers/factories/customer.factory';
import { makeOrder, makeShippingData } from '../../../helpers/factories/order.factory';

const buildUseCase = () => {
  const productRepository = createProductRepositoryMock();
  const orderRepository = createOrderRepositoryMock();
  const customerRepository = createCustomerRepositoryMock();
  const transactionRepository = createTransactionRepositoryMock();
  const deliveryRepository = createDeliveryRepositoryMock();
  const paymentGateway = createPaymentGatewayMock();
  const pollingService = createOrderStatusPollingMock();
  const appConfig = {
    baseFeeInCents: 0,
    deliveryFeeInCents: 0,
  } as unknown as AppConfigService;

  const useCase = new CreateOrderUseCase(
    productRepository,
    orderRepository,
    customerRepository,
    transactionRepository,
    deliveryRepository,
    paymentGateway,
    pollingService,
    new CreateOrderPaymentMethodResolver(),
    appConfig,
  );

  return {
    useCase,
    productRepository,
    orderRepository,
    customerRepository,
    transactionRepository,
    deliveryRepository,
    paymentGateway,
    pollingService,
  };
};

const validInput = (overrides: Partial<CreateOrderInput> = {}): CreateOrderInput => ({
  productId: '11111111-1111-1111-1111-111111111111',
  quantity: 1,
  customerEmail: 'buyer@example.com',
  shippingData: makeShippingData(),
  paymentMethodData: { cardToken: 'tok_test_123' },
  ...overrides,
});

const primeHappyPath = (mocks: ReturnType<typeof buildUseCase>) => {
  const order = makeOrder();
  mocks.productRepository.findById.mockResolvedValue(ok(makeProduct({ stock: 5 })));
  mocks.customerRepository.upsert.mockResolvedValue(ok(makeCustomer()));
  mocks.orderRepository.createPending.mockResolvedValue(ok(order));
  mocks.transactionRepository.create.mockResolvedValue(
    ok({ id: 'tx1', orderId: order.id, providerTransactionId: null, status: 'PENDING', createdAt: new Date() }),
  );
  mocks.deliveryRepository.create.mockResolvedValue(
    ok({ id: 'd1', orderId: order.id, ...makeShippingData(), createdAt: new Date() }),
  );
  mocks.paymentGateway.createTransaction.mockResolvedValue(
    ok({ transactionId: 'prov_tx_1', checkoutUrl: null, providerStatus: 'PENDING' }),
  );
  mocks.transactionRepository.linkProviderTransaction.mockResolvedValue(
    ok({ id: 'tx1', orderId: order.id, providerTransactionId: 'prov_tx_1', status: 'PENDING', createdAt: new Date() }),
  );
  mocks.pollingService.start.mockResolvedValue(ok(undefined));
  return order;
};

describe('CreateOrderUseCase', () => {
  it('runs the happy path: persists PENDING, calls the provider and starts polling', async () => {
    const mocks = buildUseCase();
    const order = primeHappyPath(mocks);

    const result = await mocks.useCase.execute(validInput());

    expect(result.isOk()).toBe(true);
    expect((result as Ok<OrderCreatedResponseDto>).value).toEqual({
      orderId: order.id,
      checkoutUrl: null,
      status: 'PENDING',
    });
    expect(mocks.orderRepository.createPending).toHaveBeenCalledTimes(1);
    expect(mocks.transactionRepository.linkProviderTransaction).toHaveBeenCalledWith(
      order.id,
      'prov_tx_1',
    );
    expect(mocks.pollingService.start).toHaveBeenCalledWith(order.id, 'prov_tx_1');
  });

  it('rejects a non-positive quantity before touching the repositories', async () => {
    const mocks = buildUseCase();

    const result = await mocks.useCase.execute(validInput({ quantity: -1 }));

    expect((result as Err<AppError>).error.code).toBe('VALIDATION_ERROR');
    expect(mocks.productRepository.findById).not.toHaveBeenCalled();
  });

  it('returns PRODUCT_NOT_FOUND when the product does not exist', async () => {
    const mocks = buildUseCase();
    mocks.productRepository.findById.mockResolvedValue(ok(null));

    const result = await mocks.useCase.execute(validInput());

    expect((result as Err<AppError>).error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('returns OUT_OF_STOCK when stock is insufficient', async () => {
    const mocks = buildUseCase();
    mocks.productRepository.findById.mockResolvedValue(ok(makeProduct({ stock: 0 })));

    const result = await mocks.useCase.execute(validInput({ quantity: 2 }));

    expect((result as Err<AppError>).error.code).toBe('OUT_OF_STOCK');
  });

  it('returns VALIDATION_ERROR when the card token is missing', async () => {
    const mocks = buildUseCase();
    mocks.productRepository.findById.mockResolvedValue(ok(makeProduct({ stock: 5 })));

    const result = await mocks.useCase.execute(
      validInput({ paymentMethodData: {} }),
    );

    expect((result as Err<AppError>).error.code).toBe('VALIDATION_ERROR');
    expect(mocks.customerRepository.upsert).not.toHaveBeenCalled();
  });

  it('propagates PAYMENT_PROVIDER_ERROR and does not start polling', async () => {
    const mocks = buildUseCase();
    primeHappyPath(mocks);
    mocks.paymentGateway.createTransaction.mockResolvedValue(
      err({ code: 'PAYMENT_PROVIDER_ERROR', message: 'provider down' }),
    );

    const result = await mocks.useCase.execute(validInput());

    expect((result as Err<AppError>).error.code).toBe('PAYMENT_PROVIDER_ERROR');
    expect(mocks.pollingService.start).not.toHaveBeenCalled();
  });
});
