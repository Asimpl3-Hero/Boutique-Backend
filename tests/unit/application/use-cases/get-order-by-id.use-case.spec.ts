import { GetOrderByIdUseCase } from '../../../../src/application/use-cases/get-order-by-id.use-case';
import { Ok, Err, ok, err } from '../../../../src/shared/railway';
import { AppError } from '../../../../src/shared/errors';
import { Order } from '../../../../src/domain/entities';
import { createOrderRepositoryMock } from '../../../helpers/mocks/ports.mock';
import { makeOrder } from '../../../helpers/factories/order.factory';

describe('GetOrderByIdUseCase', () => {
  it('returns the order when it exists', async () => {
    const repository = createOrderRepositoryMock();
    const order = makeOrder();
    repository.findById.mockResolvedValue(ok(order));

    const useCase = new GetOrderByIdUseCase(repository);
    const result = await useCase.execute(order.id);

    expect((result as Ok<Order>).value).toBe(order);
  });

  it('returns ORDER_NOT_FOUND when missing', async () => {
    const repository = createOrderRepositoryMock();
    repository.findById.mockResolvedValue(ok(null));

    const useCase = new GetOrderByIdUseCase(repository);
    const result = await useCase.execute('missing');

    expect((result as Err<AppError>).error.code).toBe('ORDER_NOT_FOUND');
  });

  it('propagates repository errors', async () => {
    const repository = createOrderRepositoryMock();
    repository.findById.mockResolvedValue(
      err({ code: 'PERSISTENCE_ERROR', message: 'db down' }),
    );

    const useCase = new GetOrderByIdUseCase(repository);
    const result = await useCase.execute('any');

    expect((result as Err<AppError>).error.code).toBe('PERSISTENCE_ERROR');
  });
});
