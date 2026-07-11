import { Order, OrderStatus, ShippingData } from '../../domain/entities';

export interface OrderResponseDto {
  id: string;
  productId: string;
  quantity: number;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  taxRatePercent: number;
  taxInCents: number;
  amountInCents: number;
  currency: string;
  status: OrderStatus;
  customerEmail: string | null;
  providerTransactionId: string | null;
  shippingData: ShippingData | null;
  createdAt: Date;
}

export const toOrderResponse = (order: Order): OrderResponseDto => ({
  id: order.id,
  productId: order.productId,
  quantity: order.quantity,
  baseFeeInCents: order.baseFeeInCents,
  deliveryFeeInCents: order.deliveryFeeInCents,
  taxRatePercent: order.taxRatePercent,
  taxInCents: order.taxInCents,
  amountInCents: order.amountInCents,
  currency: order.currency,
  status: order.status,
  customerEmail: order.customerEmail ?? null,
  providerTransactionId: order.providerTransactionId ?? null,
  shippingData: order.shippingData ?? null,
  createdAt: order.createdAt,
});
