import { AppError } from '../../../shared/errors';
import { Result } from '../../../shared/railway';

export const ORDER_STATUS_POLLING_PORT = Symbol('ORDER_STATUS_POLLING_PORT');

export interface OrderStatusPollingPort {
  start(
    orderId: string,
    providerTransactionId: string,
  ): Promise<Result<void, AppError>>;
}
