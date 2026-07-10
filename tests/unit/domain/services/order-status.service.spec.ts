import { OrderStatusService } from '../../../../src/domain/services';

describe('OrderStatusService', () => {
  const service = new OrderStatusService();

  it('maps APPROVED to APPROVED (case/space insensitive)', () => {
    expect(service.mapProviderStatus('APPROVED')).toBe('APPROVED');
    expect(service.mapProviderStatus(' approved ')).toBe('APPROVED');
  });

  it.each(['DECLINED', 'VOIDED', 'ERROR', 'error'])(
    'maps %p to DECLINED',
    (status) => {
      expect(service.mapProviderStatus(status)).toBe('DECLINED');
    },
  );

  it.each(['PENDING', 'IN_PROGRESS', 'anything-else'])(
    'maps %p to PENDING',
    (status) => {
      expect(service.mapProviderStatus(status)).toBe('PENDING');
    },
  );
});
