import { PaymentHttpClient } from '../../../../../src/infrastructure/adapters/outbound/payments/payment-http.client';
import { AppConfigService } from '../../../../../src/infrastructure/config/app-config.service';
import { Ok, Err } from '../../../../../src/shared/railway';
import { AppError } from '../../../../../src/shared/errors';

const appConfig = {
  paymentsBaseUrl: 'https://api.example.dev/v1',
  paymentsPrivateKey: 'prv_test',
} as unknown as AppConfigService;

describe('PaymentHttpClient', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns parsed data and attaches the private auth header', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: 'tx1' } }),
    });
    const client = new PaymentHttpClient(appConfig);

    const result = await client.request('/transactions', { method: 'GET' }, 'private');

    expect((result as Ok<{ data: { id: string } }>).value.data.id).toBe('tx1');
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer prv_test');
  });

  it('maps 5xx responses to PAYMENT_PROVIDER_ERROR', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    const client = new PaymentHttpClient(appConfig);

    const result = await client.request('/x', { method: 'GET' }, 'none');

    expect((result as Err<AppError>).error.code).toBe('PAYMENT_PROVIDER_ERROR');
  });

  it('maps 4xx responses to VALIDATION_ERROR', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'bad' }),
    });
    const client = new PaymentHttpClient(appConfig);

    const result = await client.request('/x', { method: 'POST' }, 'private');

    expect((result as Err<AppError>).error.code).toBe('VALIDATION_ERROR');
  });

  it('maps network errors to PAYMENT_PROVIDER_ERROR', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const client = new PaymentHttpClient(appConfig);

    const result = await client.request('/x', { method: 'GET' }, 'none');

    expect((result as Err<AppError>).error.code).toBe('PAYMENT_PROVIDER_ERROR');
  });
});
