import { GetProductByIdUseCase } from '../../../../src/application/use-cases/get-product-by-id.use-case';
import { Ok, Err, ok, err } from '../../../../src/shared/railway';
import { AppError } from '../../../../src/shared/errors';
import { Product } from '../../../../src/domain/entities';
import { createProductRepositoryMock } from '../../../helpers/mocks/ports.mock';
import { makeProduct } from '../../../helpers/factories/product.factory';

describe('GetProductByIdUseCase', () => {
  it('returns the product when it exists', async () => {
    const repository = createProductRepositoryMock();
    const product = makeProduct();
    repository.findById.mockResolvedValue(ok(product));

    const useCase = new GetProductByIdUseCase(repository);
    const result = await useCase.execute(product.id);

    expect(repository.findById).toHaveBeenCalledWith(product.id);
    expect((result as Ok<Product>).value).toBe(product);
  });

  it('returns PRODUCT_NOT_FOUND when the product is missing', async () => {
    const repository = createProductRepositoryMock();
    repository.findById.mockResolvedValue(ok(null));

    const useCase = new GetProductByIdUseCase(repository);
    const result = await useCase.execute('missing-id');

    expect(result.isErr()).toBe(true);
    expect((result as Err<AppError>).error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('propagates repository errors', async () => {
    const repository = createProductRepositoryMock();
    repository.findById.mockResolvedValue(
      err({ code: 'PERSISTENCE_ERROR', message: 'db down' }),
    );

    const useCase = new GetProductByIdUseCase(repository);
    const result = await useCase.execute('any');

    expect((result as Err<AppError>).error.code).toBe('PERSISTENCE_ERROR');
  });
});
