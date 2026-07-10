import { GetProductsUseCase } from '../../../../src/application/use-cases/get-products.use-case';
import { Ok, Err, ok, err } from '../../../../src/shared/railway';
import { AppError } from '../../../../src/shared/errors';
import { Product } from '../../../../src/domain/entities';
import { createProductRepositoryMock } from '../../../helpers/mocks/ports.mock';
import { makeProduct } from '../../../helpers/factories/product.factory';

describe('GetProductsUseCase', () => {
  it('returns the products provided by the repository', async () => {
    const repository = createProductRepositoryMock();
    const products = [makeProduct(), makeProduct({ id: 'p2', name: 'Wool Coat' })];
    repository.findAll.mockResolvedValue(ok(products));

    const useCase = new GetProductsUseCase(repository);
    const result = await useCase.execute();

    expect(repository.findAll).toHaveBeenCalledTimes(1);
    expect(result.isOk()).toBe(true);
    expect((result as Ok<Product[]>).value).toBe(products);
  });

  it('propagates repository errors', async () => {
    const repository = createProductRepositoryMock();
    repository.findAll.mockResolvedValue(
      err({ code: 'PERSISTENCE_ERROR', message: 'db down' }),
    );

    const useCase = new GetProductsUseCase(repository);
    const result = await useCase.execute();

    expect(result.isErr()).toBe(true);
    expect((result as Err<AppError>).error.code).toBe('PERSISTENCE_ERROR');
  });
});
