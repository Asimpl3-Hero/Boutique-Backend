import type { OrderStatus } from './order.entity';

export interface Transaction {
  id: string;
  orderId: string;
  providerTransactionId: string | null;
  status: OrderStatus;
  createdAt: Date;
}
