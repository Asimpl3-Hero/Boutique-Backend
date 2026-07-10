import { Delivery, ShippingData } from '../../entities';
import { AppError } from '../../../shared/errors';
import { Result } from '../../../shared/railway';

export const DELIVERY_REPOSITORY_PORT = Symbol('DELIVERY_REPOSITORY_PORT');

export interface CreateDeliveryInput {
  orderId: string;
  shippingData: ShippingData;
}

export interface DeliveryRepositoryPort {
  create(input: CreateDeliveryInput): Promise<Result<Delivery, AppError>>;
  findByOrderId(orderId: string): Promise<Result<Delivery | null, AppError>>;
}
