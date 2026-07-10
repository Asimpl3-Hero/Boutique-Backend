import { AcceptanceTokenService } from '../../../../../src/infrastructure/adapters/outbound/payments/acceptance-token.service';
import { PaymentHttpClient } from '../../../../../src/infrastructure/adapters/outbound/payments/payment-http.client';
import { AppConfigService } from '../../../../../src/infrastructure/config/app-config.service';
import { Ok, Err, ok, err } from '../../../../../src/shared/railway';
import { AppError } from '../../../../../src/shared/errors';

const buildService = (
  overrides: { acceptanceToken?: string } = {},
) => {
  const appConfig = {
    paymentsAcceptanceToken: overrides.acceptanceToken,
    paymentsPublicKey: 'pub_test',
  } as unknown as AppConfigService;
  const httpClient = { request: jest.fn() } as unknown as PaymentHttpClient;

  return {
    service: new AcceptanceTokenService(appConfig, httpClient),
    httpClient: httpClient as unknown as { request: jest.Mock },
  };
};

describe('AcceptanceTokenService', () => {
  it('uses the configured override when present and not a placeholder', async () => {
    const { service, httpClient } = buildService({ acceptanceToken: 'tok_override' });

    const result = await service.resolve();

    expect((result as Ok<string>).value).toBe('tok_override');
    expect(httpClient.request).not.toHaveBeenCalled();
  });

  it('fetches the token from the merchants endpoint when not configured', async () => {
    const { service, httpClient } = buildService({ acceptanceToken: 'REPLACE_ME' });
    httpClient.request.mockResolvedValue(
      ok({ data: { presigned_acceptance: { acceptance_token: 'tok_fetched' } } }),
    );

    const result = await service.resolve();

    expect((result as Ok<string>).value).toBe('tok_fetched');
    expect(httpClient.request).toHaveBeenCalledWith(
      '/merchants/pub_test',
      { method: 'GET' },
      'none',
    );
  });

  it('propagates a provider error from the merchants endpoint', async () => {
    const { service, httpClient } = buildService();
    httpClient.request.mockResolvedValue(
      err({ code: 'PAYMENT_PROVIDER_ERROR', message: 'down' }),
    );

    const result = await service.resolve();

    expect((result as Err<AppError>).error.code).toBe('PAYMENT_PROVIDER_ERROR');
  });

  it('errors when the merchant response has no acceptance token', async () => {
    const { service, httpClient } = buildService();
    httpClient.request.mockResolvedValue(ok({ data: {} }));

    const result = await service.resolve();

    expect((result as Err<AppError>).error.code).toBe('PAYMENT_PROVIDER_ERROR');
  });
});
