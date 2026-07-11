import { Order, ShippingData } from '../../../src/domain/entities';

export const makeShippingData = (
  overrides: Partial<ShippingData> = {},
): ShippingData => ({
  fullName: 'Ada Lovelace',
  email: 'buyer@example.com',
  phone: '+573001112233',
  address1: 'Calle 123 #45-67',
  city: 'Bogotá',
  state: 'Cundinamarca',
  zip: '110111',
  country: 'CO',
  ...overrides,
});

export const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: '33333333-3333-3333-3333-333333333333',
  productId: '11111111-1111-1111-1111-111111111111',
  customerId: '22222222-2222-2222-2222-222222222222',
  quantity: 1,
  baseFeeInCents: 0,
  deliveryFeeInCents: 0,
  taxRatePercent: 18,
  taxInCents: 19815,
  amountInCents: 129900,
  currency: 'COP',
  status: 'PENDING',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});
