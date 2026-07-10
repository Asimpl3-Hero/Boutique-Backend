import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfigService } from './infrastructure/config/app-config.service';

const API_VERSION = '1.0.0';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.disable('x-powered-by');
  expressApp.set('trust proxy', 1);

  app.enableCors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use(helmet());
  app.use(
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMaxRequests,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        errorCode: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.',
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (config.swaggerEnabled) {
    setupSwagger(app, config.swaggerPath);
  }

  await app.listen(config.port);
}

function setupSwagger(
  app: Awaited<ReturnType<typeof NestFactory.create>>,
  swaggerPath: string,
): void {
  // Swagger UI needs inline scripts/styles, which helmet's default CSP blocks.
  // Relax the CSP for the docs path only, keeping the strict policy elsewhere.
  app.use(
    `/${swaggerPath}`,
    (_req: Request, res: Response, next: NextFunction) => {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:",
      );
      next();
    },
  );

  const documentConfig = new DocumentBuilder()
    .setTitle('Boutique API')
    .setDescription(
      'Backend for the Boutique clothing checkout: products catalog, order creation and payment status. Hexagonal architecture, railway error handling, sandbox payment provider integration resolved by polling.',
    )
    .setVersion(API_VERSION)
    .addTag('Products', 'Clothing catalog browsing.')
    .addTag('Orders', 'Checkout: create an order and read its payment status.')
    .addTag('Health', 'Service liveness probe.')
    .addServer('/')
    .build();

  const document = SwaggerModule.createDocument(app, documentConfig, {
    operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
  });

  SwaggerModule.setup(swaggerPath, app, document, {
    customSiteTitle: 'Boutique API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
  });
}

void bootstrap();
