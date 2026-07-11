import { randomUUID } from 'node:crypto';
import type {
  ProductRepositoryPort,
  OrderRepositoryPort,
  CustomerRepositoryPort,
  TransactionRepositoryPort,
  DeliveryRepositoryPort,
  PaymentGatewayPort,
  OrderStatusPollingPort,
  CreatePendingOrderInput,
  UpsertCustomerInput,
  CreateTransactionInput,
  CreateDeliveryInput,
  CreateProviderTransactionInput,
} from '../../../src/domain/ports';
import type {
  Product,
  Customer,
  Order,
  Transaction,
  Delivery,
  OrderStatus,
} from '../../../src/domain/entities';
import { AppError } from '../../../src/shared/errors';
import { Result, err, ok } from '../../../src/shared/railway';

export class InMemoryProductRepository implements ProductRepositoryPort {
  constructor(private readonly products: Product[] = []) {}

  async findAll(): Promise<Result<Product[], AppError>> {
    return ok([...this.products]);
  }

  async findById(id: string): Promise<Result<Product | null, AppError>> {
    return ok(this.products.find((product) => product.id === id) ?? null);
  }

  async decrementStock(
    productId: string,
    units: number,
  ): Promise<Result<void, AppError>> {
    const product = this.products.find((item) => item.id === productId);
    if (!product || product.stock < units) {
      return err({ code: 'OUT_OF_STOCK', message: 'Not enough stock.' });
    }
    product.stock -= units;
    return ok(undefined);
  }
}

export class InMemoryCustomerRepository implements CustomerRepositoryPort {
  private readonly customers = new Map<string, Customer>();

  async upsert(input: UpsertCustomerInput): Promise<Result<Customer, AppError>> {
    const existing = this.customers.get(input.email);
    const customer: Customer = {
      id: existing?.id ?? randomUUID(),
      email: input.email,
      fullName: input.fullName,
      phone: input.phone,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };
    this.customers.set(input.email, customer);
    return ok(customer);
  }

  async findByEmail(email: string): Promise<Result<Customer | null, AppError>> {
    return ok(this.customers.get(email) ?? null);
  }
}

export class InMemoryOrderRepository implements OrderRepositoryPort {
  private readonly orders = new Map<string, Order>();

  constructor(private readonly products?: InMemoryProductRepository) {}

  async createPending(
    input: CreatePendingOrderInput,
  ): Promise<Result<Order, AppError>> {
    const order: Order = {
      id: randomUUID(),
      productId: input.productId,
      customerId: input.customerId,
      quantity: input.quantity,
      baseFeeInCents: input.baseFeeInCents,
      deliveryFeeInCents: input.deliveryFeeInCents,
      taxRatePercent: input.taxRatePercent,
      taxInCents: input.taxInCents,
      amountInCents: input.amountInCents,
      currency: input.currency,
      status: 'PENDING',
      createdAt: new Date(),
    };
    this.orders.set(order.id, order);
    return ok(order);
  }

  async findById(id: string): Promise<Result<Order | null, AppError>> {
    return ok(this.orders.get(id) ?? null);
  }

  async findByCustomerId(
    customerId: string,
  ): Promise<Result<Order[], AppError>> {
    return ok(
      [...this.orders.values()].filter(
        (order) => order.customerId === customerId,
      ),
    );
  }

  async findPending(): Promise<Result<Order[], AppError>> {
    return ok(
      [...this.orders.values()].filter((order) => order.status === 'PENDING'),
    );
  }

  async approveOrderAndDecrementStock(
    id: string,
  ): Promise<Result<Order, AppError>> {
    const order = this.orders.get(id);
    if (!order) {
      return err({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    }
    if (this.products) {
      const decremented = await this.products.decrementStock(
        order.productId,
        order.quantity,
      );
      if (decremented.isErr()) {
        return decremented as unknown as Result<Order, AppError>;
      }
    }
    order.status = 'APPROVED';
    return ok(order);
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
  ): Promise<Result<Order, AppError>> {
    const order = this.orders.get(id);
    if (!order) {
      return err({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    }
    order.status = status;
    return ok(order);
  }
}

export class InMemoryTransactionRepository implements TransactionRepositoryPort {
  private readonly transactions = new Map<string, Transaction>();

  async create(
    input: CreateTransactionInput,
  ): Promise<Result<Transaction, AppError>> {
    const transaction: Transaction = {
      id: randomUUID(),
      orderId: input.orderId,
      providerTransactionId: input.providerTransactionId ?? null,
      status: 'PENDING',
      createdAt: new Date(),
    };
    this.transactions.set(input.orderId, transaction);
    return ok(transaction);
  }

  async findByOrderId(
    orderId: string,
  ): Promise<Result<Transaction | null, AppError>> {
    return ok(this.transactions.get(orderId) ?? null);
  }

  async linkProviderTransaction(
    orderId: string,
    providerTransactionId: string,
  ): Promise<Result<Transaction, AppError>> {
    const transaction = this.transactions.get(orderId);
    if (!transaction) {
      return err({ code: 'PERSISTENCE_ERROR', message: 'No transaction.' });
    }
    transaction.providerTransactionId = providerTransactionId;
    return ok(transaction);
  }

  async updateStatus(
    orderId: string,
    status: OrderStatus,
  ): Promise<Result<Transaction, AppError>> {
    const transaction = this.transactions.get(orderId);
    if (!transaction) {
      return err({ code: 'PERSISTENCE_ERROR', message: 'No transaction.' });
    }
    transaction.status = status;
    return ok(transaction);
  }
}

export class InMemoryDeliveryRepository implements DeliveryRepositoryPort {
  private readonly deliveries = new Map<string, Delivery>();

  async create(input: CreateDeliveryInput): Promise<Result<Delivery, AppError>> {
    const delivery: Delivery = {
      id: randomUUID(),
      orderId: input.orderId,
      ...input.shippingData,
      createdAt: new Date(),
    };
    this.deliveries.set(input.orderId, delivery);
    return ok(delivery);
  }

  async findByOrderId(
    orderId: string,
  ): Promise<Result<Delivery | null, AppError>> {
    return ok(this.deliveries.get(orderId) ?? null);
  }
}

export class FixedSuccessPaymentGateway implements PaymentGatewayPort {
  public readonly created: CreateProviderTransactionInput[] = [];

  async createTransaction(input: CreateProviderTransactionInput) {
    this.created.push(input);
    return ok({
      transactionId: `prov_${randomUUID()}`,
      checkoutUrl: null,
      providerStatus: 'PENDING',
    });
  }

  async getTransactionStatus(_transactionId: string) {
    return ok({ providerStatus: 'APPROVED', orderStatus: 'APPROVED' as const });
  }
}

export class SpyPollingService implements OrderStatusPollingPort {
  public readonly calls: Array<{ orderId: string; providerTransactionId: string }> =
    [];

  async start(orderId: string, providerTransactionId: string) {
    this.calls.push({ orderId, providerTransactionId });
    return ok(undefined);
  }
}
