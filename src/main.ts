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
      [
        'Backend del checkout de ropa <span style="color:#4F6BD8;font-weight:bold">BORCELLE</span>: catálogo de productos, creación de órdenes con pago con tarjeta y consulta de su estado.',
        '',
        '### Cómo funciona',
        '',
        '<span style="color:#4F6BD8;font-weight:bold">Flujo de pago</span> — la orden nace <span style="color:#F6C445;font-weight:bold">PENDING</span>, se cobra al proveedor (sandbox) y el estado final — <span style="color:#2E9E6B;font-weight:bold">APPROVED</span> o <span style="color:#E5484D;font-weight:bold">DECLINED</span> — se resuelve por <span style="color:#4F6BD8;font-weight:bold">polling</span> del backend al proveedor.',
        '',
        '<span style="color:#4F6BD8;font-weight:bold">IVA</span> — los precios del catálogo son la <span style="font-weight:bold">base imponible</span>; el backend suma el IVA configurado (<code>TAX_RATE_PERCENT</code>) y congela el desglose en cada orden.',
        '',
        '<span style="color:#4F6BD8;font-weight:bold">Stock</span> — al aprobarse el pago, la cantidad comprada se descuenta de forma <span style="font-weight:bold">atómica</span> (guarda anti-sobreventa).',
        '',
        '<span style="color:#4F6BD8;font-weight:bold">Seguridad</span> — nunca se recibe ni persiste el número de tarjeta; solo el <span style="font-weight:bold">token</span> generado por el proveedor.',
        '',
        '<span style="color:#4F6BD8;font-weight:bold">Arquitectura</span> — hexagonal (ports & adapters), errores por Railway (<code>Result</code>), Prisma + PostgreSQL.',
      ].join('\n'),
    )
    .setVersion(API_VERSION)
    .addTag(
      'Productos',
      'Catálogo de ropa: precios base en centavos, stock disponible y la tasa de <span style="color:#4F6BD8;font-weight:bold">IVA</span> vigente.',
    )
    .addTag(
      'Órdenes',
      'Checkout: crear una orden (una por producto) y consultar su estado de pago resuelto por <span style="color:#4F6BD8;font-weight:bold">polling</span>.',
    )
    .addTag('Salud', 'Sonda de vida del servicio.')
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
      // Keeps the inline <span> highlights in descriptions (the docs-only
      // CSP already restricts what can render here).
      useUnsafeMarkdown: true,
    },
  });
}

void bootstrap();
