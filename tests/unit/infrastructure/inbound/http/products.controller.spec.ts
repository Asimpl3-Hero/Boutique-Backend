import { HttpException } from '@nestjs/common';
import { ProductsController } from '../../../../../src/infrastructure/adapters/inbound/http/products.controller';
import { GetProductsUseCase } from '../../../../../src/application/use-cases/get-products.use-case';
import { GetProductByIdUseCase } from '../../../../../src/application/use-cases/get-product-by-id.use-case';
import { AppConfigService } from '../../../../../src/infrastructure/config/app-config.service';
import { ok, err } from '../../../../../src/shared/railway';
import { makeProduct } from '../../../../helpers/factories/product.factory';

describe('ProductsController', () => {
  const buildController = () => {
    const getProducts = { execute: jest.fn() };
    const getProductById = { execute: jest.fn() };
    const appConfig = { taxRatePercent: 18 } as unknown as AppConfigService;
    const controller = new ProductsController(
      getProducts as unknown as GetProductsUseCase,
      getProductById as unknown as GetProductByIdUseCase,
      appConfig,
    );

    return { controller, getProducts, getProductById };
  };

  describe('GET /products', () => {
    it('returns the mapped product list', async () => {
      const { controller, getProducts } = buildController();
      const product = makeProduct();
      getProducts.execute.mockResolvedValue(ok([product]));

      const response = await controller.getProducts();

      expect(response).toEqual([
        {
          id: product.id,
          name: product.name,
          description: product.description,
          priceInCents: product.priceInCents,
          imageUrl: product.imageUrl,
          stock: product.stock,
          currency: product.currency,
          taxRatePercent: 18,
          createdAt: product.createdAt,
        },
      ]);
    });

    it('throws an HttpException on error', async () => {
      const { controller, getProducts } = buildController();
      getProducts.execute.mockResolvedValue(
        err({ code: 'PERSISTENCE_ERROR', message: 'db down' }),
      );

      await expect(controller.getProducts()).rejects.toBeInstanceOf(
        HttpException,
      );
    });
  });

  describe('GET /products/:id', () => {
    it('returns the mapped product', async () => {
      const { controller, getProductById } = buildController();
      const product = makeProduct();
      getProductById.execute.mockResolvedValue(ok(product));

      const response = await controller.getProductById(product.id);

      expect(response.id).toBe(product.id);
      expect(response.taxRatePercent).toBe(18);
      expect(getProductById.execute).toHaveBeenCalledWith(product.id);
    });

    it('throws 404 HttpException when not found', async () => {
      const { controller, getProductById } = buildController();
      getProductById.execute.mockResolvedValue(
        err({ code: 'PRODUCT_NOT_FOUND', message: 'nope' }),
      );

      await expect(
        controller.getProductById('missing'),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
