import { Customer } from '../../../src/domain/entities';

export const makeCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  id: '22222222-2222-2222-2222-222222222222',
  email: 'buyer@example.com',
  fullName: 'Ada Lovelace',
  phone: '+573001112233',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});
