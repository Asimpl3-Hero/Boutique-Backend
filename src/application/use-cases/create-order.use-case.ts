import { Inject, Injectable } from '@nestjs/common';
import {
  PRODUCT_REPOSITORY_PORT,
  ORDER_REPOSITORY_PORT,
  CUSTOMER_REPOSITORY_PORT,
  TRANSACTION_REPOSITORY_PORT,
  DELIVERY_REPOSITORY_PORT,
  ORDER_STATUS_POLLING_PORT,
  PAYMENT_GATEWAY_PORT,
} from '../../domain/ports';
import type {
  ProductRepositoryPort,
  OrderRepositoryPort,
  CustomerRepositoryPort,
  TransactionRepositoryPort,
  DeliveryRepositoryPort,
  OrderStatusPollingPort,
  CreatedProviderTransaction,
  PaymentMethodInput,
  PaymentGatewayPort,
} from '../../domain/ports';
import type {
  Product,
  Customer,
  Order,
  ShippingData,
} from '../../domain/entities';
import { Money } from '../../domain/value-objects';
import { AppConfigService } from '../../infrastructure/config/app-config.service';
import { AppError } from '../../shared/errors';
import { Result, err } from '../../shared/railway';
import { OrderCreatedResponseDto } from '../dto/order-created-response.dto';
import {
  CreateOrderPaymentMethodData,
  CreateOrderPaymentMethodResolver,
} from '../services/create-order-payment-method.resolver';

export interface CreateOrderInput {
  productId: string;
  quantity?: number;
  customerEmail: string;
  shippingData: ShippingData;
  paymentMethodData?: CreateOrderPaymentMethodData;
}

interface CreateOrderContextBase {
  input: CreateOrderInput;
  quantity: number;
}

interface CreateOrderContextWithProduct extends CreateOrderContextBase {
  product: Product;
}

interface CreateOrderContextWithMoney extends CreateOrderContextWithProduct {
  money: Money;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
}

interface CreateOrderContextWithPaymentMethod
  extends CreateOrderContextWithMoney {
  paymentMethod: PaymentMethodInput;
}

interface CreateOrderContextWithCustomer
  extends CreateOrderContextWithPaymentMethod {
  customer: Customer;
}

interface CreateOrderContextWithOrder extends CreateOrderContextWithCustomer {
  order: Order;
}

interface CreateOrderContextWithPayment extends CreateOrderContextWithOrder {
  payment: CreatedProviderTransaction;
}

@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly productRepository: ProductRepositoryPort,
    @Inject(ORDER_REPOSITORY_PORT)
    private readonly orderRepository: OrderRepositoryPort,
    @Inject(CUSTOMER_REPOSITORY_PORT)
    private readonly customerRepository: CustomerRepositoryPort,
    @Inject(TRANSACTION_REPOSITORY_PORT)
    private readonly transactionRepository: TransactionRepositoryPort,
    @Inject(DELIVERY_REPOSITORY_PORT)
    private readonly deliveryRepository: DeliveryRepositoryPort,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly paymentGateway: PaymentGatewayPort,
    @Inject(ORDER_STATUS_POLLING_PORT)
    private readonly pollingService: OrderStatusPollingPort,
    private readonly paymentMethodResolver: CreateOrderPaymentMethodResolver,
    private readonly appConfig: AppConfigService,
  ) {}

  public async execute(
    input: CreateOrderInput,
  ): Promise<Result<OrderCreatedResponseDto, AppError>> {
    const initialContext = this.validateQuantity(input).map((quantity) => ({
      input,
      quantity,
    }));

    const withProduct = await initialContext.asyncFlatMap((ctx) =>
      this.loadProduct(ctx),
    );

    const withMoney = withProduct.flatMap((ctx) =>
      this.ensureStockAndMoney(ctx),
    );

    const withPaymentMethod = withMoney.flatMap((ctx) =>
      this.resolvePaymentMethod(ctx),
    );

    // --- Phase 1: persist PENDING records ---
    const withCustomer = await withPaymentMethod.asyncFlatMap((ctx) =>
      this.upsertCustomer(ctx),
    );

    const withOrder = await withCustomer.asyncFlatMap((ctx) =>
      this.createPendingOrder(ctx),
    );

    const withTransaction = await withOrder.asyncFlatMap((ctx) =>
      this.createTransaction(ctx),
    );

    const withDelivery = await withTransaction.asyncFlatMap((ctx) =>
      this.createDelivery(ctx),
    );

    // --- Phase 2: call the payment provider and link the result ---
    const withPayment = await withDelivery.asyncFlatMap((ctx) =>
      this.createPayment(ctx),
    );

    const linked = await withPayment.asyncFlatMap((ctx) =>
      this.linkProviderTransaction(ctx),
    );

    const startedPolling = await linked.asyncFlatMap((ctx) =>
      this.startPolling(ctx),
    );

    return startedPolling.map((ctx) => ({
      orderId: ctx.order.id,
      checkoutUrl: ctx.payment.checkoutUrl,
      status: ctx.order.status,
    }));
  }

  private validateQuantity(input: CreateOrderInput): Result<number, AppError> {
    const quantity = input.quantity ?? 1;

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return err({
        code: 'VALIDATION_ERROR',
        message: 'Quantity must be a positive integer.',
      });
    }

    return Result.ok(quantity);
  }

  private async loadProduct(
    ctx: CreateOrderContextBase,
  ): Promise<Result<CreateOrderContextWithProduct, AppError>> {
    const productResult = await this.productRepository.findById(
      ctx.input.productId,
    );

    return productResult.flatMap((product) => {
      if (!product) {
        return err({
          code: 'PRODUCT_NOT_FOUND',
          message: `Product ${ctx.input.productId} was not found.`,
        });
      }

      return Result.ok({ ...ctx, product });
    });
  }

  private ensureStockAndMoney(
    ctx: CreateOrderContextWithProduct,
  ): Result<CreateOrderContextWithMoney, AppError> {
    if (ctx.product.stock < ctx.quantity) {
      return err({
        code: 'OUT_OF_STOCK',
        message: `Product ${ctx.product.id} does not have enough stock for quantity ${ctx.quantity}.`,
      });
    }

    const subtotal = ctx.product.priceInCents * ctx.quantity;
    const baseFeeInCents = this.appConfig.baseFeeInCents;
    const deliveryFeeInCents = this.appConfig.deliveryFeeInCents;
    const totalInCents = subtotal + baseFeeInCents + deliveryFeeInCents;

    return Money.create(totalInCents, ctx.product.currency).map((money) => ({
      ...ctx,
      money,
      baseFeeInCents,
      deliveryFeeInCents,
    }));
  }

  private resolvePaymentMethod(
    ctx: CreateOrderContextWithMoney,
  ): Result<CreateOrderContextWithPaymentMethod, AppError> {
    return this.paymentMethodResolver
      .resolve(ctx.input.paymentMethodData)
      .map((paymentMethod) => ({ ...ctx, paymentMethod }));
  }

  private async upsertCustomer(
    ctx: CreateOrderContextWithPaymentMethod,
  ): Promise<Result<CreateOrderContextWithCustomer, AppError>> {
    const customerResult = await this.customerRepository.upsert({
      email: ctx.input.customerEmail,
      fullName: ctx.input.shippingData.fullName,
      phone: ctx.input.shippingData.phone,
    });

    return customerResult.map((customer) => ({ ...ctx, customer }));
  }

  private async createPendingOrder(
    ctx: CreateOrderContextWithCustomer,
  ): Promise<Result<CreateOrderContextWithOrder, AppError>> {
    const orderResult = await this.orderRepository.createPending({
      productId: ctx.product.id,
      customerId: ctx.customer.id,
      quantity: ctx.quantity,
      baseFeeInCents: ctx.baseFeeInCents,
      deliveryFeeInCents: ctx.deliveryFeeInCents,
      amountInCents: ctx.money.amountInCents,
      currency: ctx.money.currency,
    });

    return orderResult.map((order) => ({ ...ctx, order }));
  }

  private async createTransaction(
    ctx: CreateOrderContextWithOrder,
  ): Promise<Result<CreateOrderContextWithOrder, AppError>> {
    const txResult = await this.transactionRepository.create({
      orderId: ctx.order.id,
    });

    return txResult.map(() => ctx);
  }

  private async createDelivery(
    ctx: CreateOrderContextWithOrder,
  ): Promise<Result<CreateOrderContextWithOrder, AppError>> {
    const deliveryResult = await this.deliveryRepository.create({
      orderId: ctx.order.id,
      shippingData: ctx.input.shippingData,
    });

    return deliveryResult.map(() => ctx);
  }

  private async createPayment(
    ctx: CreateOrderContextWithOrder,
  ): Promise<Result<CreateOrderContextWithPayment, AppError>> {
    const paymentResult = await this.paymentGateway.createTransaction({
      orderReference: ctx.order.id,
      amountInCents: ctx.money.amountInCents,
      currency: ctx.money.currency,
      customerEmail: ctx.input.customerEmail,
      paymentMethod: ctx.paymentMethod,
    });

    return paymentResult.map((payment) => ({ ...ctx, payment }));
  }

  private async linkProviderTransaction(
    ctx: CreateOrderContextWithPayment,
  ): Promise<Result<CreateOrderContextWithPayment, AppError>> {
    const linkResult = await this.transactionRepository.linkProviderTransaction(
      ctx.order.id,
      ctx.payment.transactionId,
    );

    return linkResult.map(() => ctx);
  }

  private async startPolling(
    ctx: CreateOrderContextWithPayment,
  ): Promise<Result<CreateOrderContextWithPayment, AppError>> {
    const pollingResult = await this.pollingService.start(
      ctx.order.id,
      ctx.payment.transactionId,
    );

    return pollingResult.map(() => ctx);
  }
}
