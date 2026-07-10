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
  amountInCents: number;
  currency: string;
  status: OrderStatus;
  createdAt: Date;
  customerEmail?: string;
  providerTransactionId?: string;
  shippingData?: ShippingData;
}
