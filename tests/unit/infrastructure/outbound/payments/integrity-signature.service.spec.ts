import { createHash } from 'node:crypto';
import { IntegritySignatureService } from '../../../../../src/infrastructure/adapters/outbound/payments/integrity-signature.service';
import { AppConfigService } from '../../../../../src/infrastructure/config/app-config.service';

describe('IntegritySignatureService', () => {
  const appConfig = {
    paymentsIntegritySecret: 'test_secret',
  } as unknown as AppConfigService;
  const service = new IntegritySignatureService(appConfig);

  it('builds a SHA-256 signature over reference+amount+currency+secret', () => {
    const signature = service.build('ref-1', 15000, 'COP');

    const expected = createHash('sha256')
      .update('ref-115000COPtest_secret')
      .digest('hex');
    expect(signature).toBe(expected);
    expect(signature).toMatch(/^[a-f0-9]{64}$/);
  });

  it('changes when any input changes', () => {
    const base = service.build('ref-1', 15000, 'COP');
    expect(service.build('ref-2', 15000, 'COP')).not.toBe(base);
    expect(service.build('ref-1', 15001, 'COP')).not.toBe(base);
    expect(service.build('ref-1', 15000, 'USD')).not.toBe(base);
  });
});
