import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Boutique API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health -> 200 { status: ok }', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('GET /products -> 200 array', async () => {
    const response = await request(app.getHttpServer()).get('/products');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('POST /orders with an invalid payload -> 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders')
      .send({ productId: 'not-a-uuid', customerEmail: 'bad', shippingData: {} });

    expect(response.status).toBe(400);
  });

  it('GET /orders/:id with an unknown uuid -> 404', async () => {
    const response = await request(app.getHttpServer()).get(
      '/orders/00000000-0000-0000-0000-000000000000',
    );

    expect(response.status).toBe(404);
    expect(response.body.errorCode).toBe('ORDER_NOT_FOUND');
  });

  it('GET /orders/:id with a malformed id -> 400', async () => {
    const response = await request(app.getHttpServer()).get('/orders/not-a-uuid');

    expect(response.status).toBe(400);
  });
});
