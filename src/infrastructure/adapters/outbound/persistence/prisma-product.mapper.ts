import type { Product as PrismaProduct } from '@prisma/client';
import { Product } from '../../../../domain/entities';

export const toProductEntity = (row: PrismaProduct): Product => ({
  id: row.id,
  name: row.name,
  description: row.description,
  priceInCents: row.priceInCents,
  imageUrl: row.imageUrl,
  stock: row.stock,
  currency: row.currency,
  createdAt: row.createdAt,
});
