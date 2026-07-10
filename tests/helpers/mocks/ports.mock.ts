import type { ProductRepositoryPort } from '../../../src/domain/ports';

export const createProductRepositoryMock =
  (): jest.Mocked<ProductRepositoryPort> => ({
    findAll: jest.fn(),
    findById: jest.fn(),
    decrementStock: jest.fn(),
  });
