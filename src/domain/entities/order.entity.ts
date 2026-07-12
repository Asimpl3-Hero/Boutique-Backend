export type OrderStatus = 'PENDING' | 'APPROVED' | 'DECLINED';

export interface ShippingData {
  fullName: string;
  email: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

export interface Order {
  id: string;
  productId: string;
  customerId: string;
  quantity: number;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  /** VAT rate applied at creation time (integer percent, frozen per order). */
  taxRatePercent: number;
  /** VAT added on top of the base; amountInCents already includes it. */
  taxInCents: number;
  amountInCents: number;
  currency: string;
  status: OrderStatus;
  createdAt: Date;
  customerEmail?: string;
  providerTransactionId?: string;
  shippingData?: ShippingData;
}
