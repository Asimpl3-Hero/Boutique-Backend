import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './infrastructure/config/app-config.service';
import { PrismaService } from './infrastructure/adapters/outbound/persistence/prisma.service';
import { PrismaProductRepositoryAdapter } from './infrastructure/adapters/outbound/persistence/prisma-product.repository.adapter';
import { PRODUCT_REPOSITORY_PORT } from './domain/ports';
import { GetProductsUseCase } from './application/use-cases/get-products.use-case';
import { GetProductByIdUseCase } from './application/use-cases/get-product-by-id.use-case';
import { ProductsController } from './infrastructure/adapters/inbound/http/products.controller';
import { HealthController } from './infrastructure/adapters/inbound/http/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [ProductsController, HealthController],
  providers: [
    AppConfigService,
    PrismaService,
    GetProductsUseCase,
    GetProductByIdUseCase,
    {
      provide: PRODUCT_REPOSITORY_PORT,
      useClass: PrismaProductRepositoryAdapter,
    },
  ],
})
export class AppModule {}
