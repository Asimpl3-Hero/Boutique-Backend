import { CreateOrderUseCase } from '../../../src/application/use-cases/create-order.use-case';
import { GetOrderByIdUseCase } from '../../../src/application/use-cases/get-order-by-id.use-case';
import { CreateOrderPaymentMethodResolver } from '../../../src/application/services/create-order-payment-method.resolver';
import { TaxService } from '../../../src/domain/services';
import type { AppConfigService } from '../../../src/infrastructure/config/app-config.service';
import { Ok, Err } from '../../../src/shared/railway';
import { AppError } from '../../../src/shared/errors';
import { OrderCreatedResponseDto } from '../../../src/application/dto/order-created-response.dto';
import { Order } from '../../../src/domain/entities';
import { makeProduct } from '../../helpers/factories/product.factory';
import { makeShippingData } from '../../helpers/factories/order.factory';
import {
  FixedSuccessPaymentGateway,
  InMemoryCustomerRepository,
  InMemoryDeliveryRepository,
  InMemoryOrderRepository,
  InMemoryProductRepository,
  InMemoryTransactionRepository,
  SpyPollingService,
} from '../../helpers/mocks/in-memory-ports';

const appConfig = {
  baseFeeInCents: 500000,
  deliveryFeeInCents: 500000,
  taxRatePercent: 18,
} as unknown as AppConfigService;

const buildFlow = (products = [makeProduct({ stock: 5 })]) => {
  const productRepository = new InMemoryProductRepository(products);
  const orderRepository = new InMemoryOrderRepository(productRepository);
  const customerRepository = new InMemoryCustomerRepository();
  const transactionRepository = new InMemoryTransactionRepository();
  const deliveryRepository = new InMemoryDeliveryRepository();
  const paymentGateway = new FixedSuccessPaymentGateway();
  const pollingService = new SpyPollingService();

  const createOrderUseCase = new CreateOrderUseCase(
    productRepository,
    orderRepository,
    customerRepository,
    transactionRepository,
    deliveryRepository,
    paymentGateway,
    pollingService,
    new CreateOrderPaymentMethodResolver(),
    new TaxService(),
    appConfig,
  );
  const getOrderByIdUseCase = new GetOrderByIdUseCase(orderRepository);

  return {
    createOrderUseCase,
    getOrderByIdUseCase,
    productRepository,
    orderRepository,
    customerRepository,
    transactionRepository,
    deliveryRepository,
    paymentGateway,
    pollingService,
  };
};

const validInput = (productId: string) => ({
  productId,
  quantity: 2,
  customerEmail: 'buyer@example.com',
  shippingData: makeShippingData(),
  paymentMethodData: { cardToken: 'tok_test_card_123' },
});

describe('Order flow (integration)', () => {
  it('persists the PENDING order, delivery, transaction and starts polling', async () => {
    const product = makeProduct({ stock: 5 });
    const flow = buildFlow([product]);

    const createResult = await flow.createOrderUseCase.execute(
      validInput(product.id),
    );

    expect(createResult.isOk()).toBe(true);
    const created = (createResult as Ok<OrderCreatedResponseDto>).value;
    expect(created.status).toBe('PENDING');

    // customer upserted, delivery + transaction persisted, provider called, polling started
    expect(
      (await flow.customerRepository.findByEmail('buyer@example.com')).isOk(),
    ).toBe(true);
    expect(
      (await flow.deliveryRepository.findByOrderId(created.orderId)).isOk(),
    ).toBe(true);
    expect(flow.paymentGateway.created).toHaveLength(1);
    expect(flow.pollingService.calls).toEqual([
      {
        orderId: created.orderId,
        providerTransactionId: flow.paymentGateway.created.length
          ? expect.stringMatching(/^prov_/)
          : '',
      },
    ]);

    // readable by id, still PENDING
    const getResult = await flow.getOrderByIdUseCase.execute(created.orderId);
    const stored = (getResult as Ok<Order>).value;
    expect(stored.id).toBe(created.orderId);
    expect(stored.status).toBe('PENDING');
  });

  it('computes the amount as price*qty plus fees plus VAT on top', async () => {
    const product = makeProduct({ stock: 5, priceInCents: 1000, currency: 'COP' });
    const flow = buildFlow([product]);

    const createResult = await flow.createOrderUseCase.execute(
      validInput(product.id),
    );
    const created = (createResult as Ok<OrderCreatedResponseDto>).value;
    const stored = (
      await flow.getOrderByIdUseCase.execute(created.orderId)
    ).match((o) => o, () => null);

    // Base: 1000 * 2 + baseFee 500000 + deliveryFee 500000 = 1_002_000;
    // VAT on top at 18%: 180_360 → 1_182_360 charged.
    expect(stored?.taxRatePercent).toBe(18);
    expect(stored?.taxInCents).toBe(180_360);
    expect(stored?.amountInCents).toBe(1_182_360);
  });

  it('returns PRODUCT_NOT_FOUND when the product does not exist', async () => {
    const flow = buildFlow([]);

    const result = await flow.createOrderUseCase.execute(
      validInput('11111111-1111-1111-1111-111111111111'),
    );

    expect((result as Err<AppError>).error.code).toBe('PRODUCT_NOT_FOUND');
    expect(flow.pollingService.calls).toHaveLength(0);
  });

  it('returns OUT_OF_STOCK when quantity exceeds stock', async () => {
    const product = makeProduct({ stock: 1 });
    const flow = buildFlow([product]);

    const result = await flow.createOrderUseCase.execute(validInput(product.id));

    expect((result as Err<AppError>).error.code).toBe('OUT_OF_STOCK');
  });
});
