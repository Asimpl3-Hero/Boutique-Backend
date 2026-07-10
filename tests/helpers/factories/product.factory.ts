import { Product } from '../../../src/domain/entities';

export const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Linen Shirt',
  description: 'A breathable linen shirt.',
  priceInCents: 129900,
  imageUrl: 'https://example.com/linen-shirt.png',
  stock: 12,
  currency: 'COP',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});
