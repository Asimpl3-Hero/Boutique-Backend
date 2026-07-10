import type {
  ProductRepositoryPort,
  OrderRepositoryPort,
  CustomerRepositoryPort,
  TransactionRepositoryPort,
  DeliveryRepositoryPort,
  PaymentGatewayPort,
  OrderStatusPollingPort,
} from '../../../src/domain/ports';

export const createProductRepositoryMock =
  (): jest.Mocked<ProductRepositoryPort> => ({
    findAll: jest.fn(),
    findById: jest.fn(),
    decrementStock: jest.fn(),
  });

export const createOrderRepositoryMock =
  (): jest.Mocked<OrderRepositoryPort> => ({
    createPending: jest.fn(),
    findById: jest.fn(),
    findByCustomerId: jest.fn(),
    findPending: jest.fn(),
    approveOrderAndDecrementStock: jest.fn(),
    updateStatus: jest.fn(),
  });

export const createCustomerRepositoryMock =
  (): jest.Mocked<CustomerRepositoryPort> => ({
    upsert: jest.fn(),
    findByEmail: jest.fn(),
  });

export const createTransactionRepositoryMock =
  (): jest.Mocked<TransactionRepositoryPort> => ({
    create: jest.fn(),
    findByOrderId: jest.fn(),
    linkProviderTransaction: jest.fn(),
    updateStatus: jest.fn(),
  });

export const createDeliveryRepositoryMock =
  (): jest.Mocked<DeliveryRepositoryPort> => ({
    create: jest.fn(),
    findByOrderId: jest.fn(),
  });

export const createPaymentGatewayMock =
  (): jest.Mocked<PaymentGatewayPort> => ({
    createTransaction: jest.fn(),
    getTransactionStatus: jest.fn(),
  });

export const createOrderStatusPollingMock =
  (): jest.Mocked<OrderStatusPollingPort> => ({
    start: jest.fn(),
  });
