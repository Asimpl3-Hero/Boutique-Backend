import { OrderStatus } from '../entities';

export class OrderStatusService {
  public mapProviderStatus(status: string): OrderStatus {
    const normalized = status.trim().toUpperCase();

    if (normalized === 'APPROVED') {
      return 'APPROVED';
    }

    if (
      normalized === 'DECLINED' ||
      normalized === 'VOIDED' ||
      normalized === 'ERROR'
    ) {
      return 'DECLINED';
    }

    return 'PENDING';
  }
}
