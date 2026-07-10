import { HealthController } from '../../../../../src/infrastructure/adapters/inbound/http/health.controller';

describe('HealthController', () => {
  it('reports an ok status', () => {
    const controller = new HealthController();

    expect(controller.check()).toEqual({ status: 'ok' });
  });
});
