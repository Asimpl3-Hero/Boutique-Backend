import { Product } from '../../domain/entities';

export interface ProductResponseDto {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  imageUrl: string;
  stock: number;
  currency: string;
  /** VAT rate already included in priceInCents (integer percent). */
  taxRatePercent: number;
  createdAt: Date;
}

export const toProductResponse = (
  product: Product,
  taxRatePercent: number,
): ProductResponseDto => ({
  id: product.id,
  name: product.name,
  description: product.description,
  priceInCents: product.priceInCents,
  imageUrl: product.imageUrl,
  stock: product.stock,
  currency: product.currency,
  taxRatePercent,
  createdAt: product.createdAt,
});
