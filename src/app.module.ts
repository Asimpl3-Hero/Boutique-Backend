import { join } from 'node:path';
import { cwd } from 'node:process';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppConfigService } from './infrastructure/config/app-config.service';
import { PrismaService } from './infrastructure/adapters/outbound/persistence/prisma.service';
import { PrismaProductRepositoryAdapter } from './infrastructure/adapters/outbound/persistence/prisma-product.repository.adapter';
import { PrismaCustomerRepositoryAdapter } from './infrastructure/adapters/outbound/persistence/prisma-customer.repository.adapter';
import { PrismaOrderRepositoryAdapter } from './infrastructure/adapters/outbound/persistence/prisma-order.repository.adapter';
import { PrismaTransactionRepositoryAdapter } from './infrastructure/adapters/outbound/persistence/prisma-transaction.repository.adapter';
import { PrismaDeliveryRepositoryAdapter } from './infrastructure/adapters/outbound/persistence/prisma-delivery.repository.adapter';
import { PaymentHttpClient } from './infrastructure/adapters/outbound/payments/payment-http.client';
import { AcceptanceTokenService } from './infrastructure/adapters/outbound/payments/acceptance-token.service';
import { IntegritySignatureService } from './infrastructure/adapters/outbound/payments/integrity-signature.service';
import { PaymentMethodMapper } from './infrastructure/adapters/outbound/payments/payment-method.mapper';
import { PaymentGatewayAdapter } from './infrastructure/adapters/outbound/payments/payment-gateway.adapter';
import { OrderStatusPollingService } from './infrastructure/adapters/outbound/payments/order-status-polling.service';
import { OrderStatusService, TaxService } from './domain/services';
import {
  PRODUCT_REPOSITORY_PORT,
  CUSTOMER_REPOSITORY_PORT,
  ORDER_REPOSITORY_PORT,
  TRANSACTION_REPOSITORY_PORT,
  DELIVERY_REPOSITORY_PORT,
  PAYMENT_GATEWAY_PORT,
  ORDER_STATUS_POLLING_PORT,
} from './domain/ports';
import { GetProductsUseCase } from './application/use-cases/get-products.use-case';
import { GetProductByIdUseCase } from './application/use-cases/get-product-by-id.use-case';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { GetOrderByIdUseCase } from './application/use-cases/get-order-by-id.use-case';
import { CreateOrderPaymentMethodResolver } from './application/services/create-order-payment-method.resolver';
import { ProductsController } from './infrastructure/adapters/inbound/http/products.controller';
import { OrdersController } from './infrastructure/adapters/inbound/http/orders.controller';
import { HealthController } from './infrastructure/adapters/inbound/http/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Product photos and other public assets under /static/*.
    // cwd() (repo root / container WORKDIR) is stable across dev and dist.
    ServeStaticModule.forRoot({
      rootPath: join(cwd(), 'public'),
      serveRoot: '/static',
    }),
  ],
  controllers: [ProductsController, OrdersController, HealthController],
  providers: [
    AppConfigService,
    PrismaService,
    // Payment integration
    PaymentHttpClient,
    AcceptanceTokenService,
    IntegritySignatureService,
    PaymentMethodMapper,
    { provide: OrderStatusService, useValue: new OrderStatusService() },
    { provide: TaxService, useValue: new TaxService() },
    // Application
    CreateOrderPaymentMethodResolver,
    GetProductsUseCase,
    GetProductByIdUseCase,
    CreateOrderUseCase,
    GetOrderByIdUseCase,
    // Ports -> adapters
    {
      provide: PRODUCT_REPOSITORY_PORT,
      useClass: PrismaProductRepositoryAdapter,
    },
    {
      provide: CUSTOMER_REPOSITORY_PORT,
      useClass: PrismaCustomerRepositoryAdapter,
    },
    {
      provide: ORDER_REPOSITORY_PORT,
      useClass: PrismaOrderRepositoryAdapter,
    },
    {
      provide: TRANSACTION_REPOSITORY_PORT,
      useClass: PrismaTransactionRepositoryAdapter,
    },
    {
      provide: DELIVERY_REPOSITORY_PORT,
      useClass: PrismaDeliveryRepositoryAdapter,
    },
    {
      provide: PAYMENT_GATEWAY_PORT,
      useClass: PaymentGatewayAdapter,
    },
    {
      provide: ORDER_STATUS_POLLING_PORT,
      useClass: OrderStatusPollingService,
    },
  ],
})
export class AppModule {}
