export interface Delivery {
  id: string;
  orderId: string;
  fullName: string;
  email: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  createdAt: Date;
}
