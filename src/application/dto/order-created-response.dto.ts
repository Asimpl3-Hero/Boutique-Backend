import { OrderStatus } from '../../domain/entities';

export interface OrderCreatedResponseDto {
  orderId: string;
  checkoutUrl: string | null;
  status: OrderStatus;
}
