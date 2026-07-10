import { PaymentGatewayAdapter } from '../../../../../src/infrastructure/adapters/outbound/payments/payment-gateway.adapter';
import { PaymentHttpClient } from '../../../../../src/infrastructure/adapters/outbound/payments/payment-http.client';
import { AcceptanceTokenService } from '../../../../../src/infrastructure/adapters/outbound/payments/acceptance-token.service';
import { IntegritySignatureService } from '../../../../../src/infrastructure/adapters/outbound/payments/integrity-signature.service';
import { PaymentMethodMapper } from '../../../../../src/infrastructure/adapters/outbound/payments/payment-method.mapper';
import { OrderStatusService } from '../../../../../src/domain/services';
import { Ok, Err, ok, err } from '../../../../../src/shared/railway';
import { AppError } from '../../../../../src/shared/errors';
import {
  CreatedProviderTransaction,
  CreateProviderTransactionInput,
  ProviderTransactionStatus,
} from '../../../../../src/domain/ports';

const buildAdapter = () => {
  const httpClient = { request: jest.fn() } as unknown as PaymentHttpClient;
  const acceptanceTokenService = {
    resolve: jest.fn().mockResolvedValue(ok('acc_tok')),
  } as unknown as AcceptanceTokenService;
  const integritySignatureService = {
    build: jest.fn().mockReturnValue('sig'),
  } as unknown as IntegritySignatureService;

  const adapter = new PaymentGatewayAdapter(
    new OrderStatusService(),
    httpClient,
    acceptanceTokenService,
    new PaymentMethodMapper(),
    integritySignatureService,
  );

  return {
    adapter,
    httpClient: httpClient as unknown as { request: jest.Mock },
    acceptanceTokenService: acceptanceTokenService as unknown as {
      resolve: jest.Mock;
    },
  };
};

const input: CreateProviderTransactionInput = {
  orderReference: 'order-1',
  amountInCents: 15000,
  currency: 'COP',
  customerEmail: 'buyer@example.com',
  paymentMethod: { type: 'CARD', cardToken: 'tok_123' },
};

describe('PaymentGatewayAdapter', () => {
  describe('createTransaction', () => {
    it('creates a transaction on the happy path', async () => {
      const { adapter, httpClient } = buildAdapter();
      httpClient.request.mockResolvedValue(
        ok({ data: { id: 'prov_tx_1', status: 'PENDING', checkout_url: null } }),
      );

      const result = await adapter.createTransaction(input);

      const value = (result as Ok<CreatedProviderTransaction>).value;
      expect(value.transactionId).toBe('prov_tx_1');
      expect(value.providerStatus).toBe('PENDING');
      const [path, requestInit] = httpClient.request.mock.calls[0];
      expect(path).toBe('/transactions');
      const body = JSON.parse(requestInit.body);
      expect(body).toMatchObject({
        reference: 'order-1',
        acceptance_token: 'acc_tok',
        signature: 'sig',
        payment_method: { type: 'CARD', token: 'tok_123' },
      });
    });

    it('propagates acceptance token errors', async () => {
      const { adapter, acceptanceTokenService } = buildAdapter();
      acceptanceTokenService.resolve.mockResolvedValue(
        err({ code: 'PAYMENT_PROVIDER_ERROR', message: 'no token' }),
      );

      const result = await adapter.createTransaction(input);

      expect((result as Err<AppError>).error.code).toBe('PAYMENT_PROVIDER_ERROR');
    });

    it('returns VALIDATION_ERROR when the card token is a placeholder', async () => {
      const { adapter } = buildAdapter();

      const result = await adapter.createTransaction({
        ...input,
        paymentMethod: { type: 'CARD', cardToken: 'REPLACE_ME' },
      });

      expect((result as Err<AppError>).error.code).toBe('VALIDATION_ERROR');
    });

    it('propagates provider HTTP errors', async () => {
      const { adapter, httpClient } = buildAdapter();
      httpClient.request.mockResolvedValue(
        err({ code: 'PAYMENT_PROVIDER_ERROR', message: 'down' }),
      );

      const result = await adapter.createTransaction(input);

      expect((result as Err<AppError>).error.code).toBe('PAYMENT_PROVIDER_ERROR');
    });

    it('errors when the provider returns no transaction id', async () => {
      const { adapter, httpClient } = buildAdapter();
      httpClient.request.mockResolvedValue(ok({ data: { status: 'PENDING' } }));

      const result = await adapter.createTransaction(input);

      expect((result as Err<AppError>).error.code).toBe('PAYMENT_PROVIDER_ERROR');
    });
  });

  describe('getTransactionStatus', () => {
    it('maps the provider status to an order status', async () => {
      const { adapter, httpClient } = buildAdapter();
      httpClient.request.mockResolvedValue(ok({ data: { status: 'APPROVED' } }));

      const result = await adapter.getTransactionStatus('prov_tx_1');

      const value = (result as Ok<ProviderTransactionStatus>).value;
      expect(value.providerStatus).toBe('APPROVED');
      expect(value.orderStatus).toBe('APPROVED');
    });

    it('propagates provider HTTP errors', async () => {
      const { adapter, httpClient } = buildAdapter();
      httpClient.request.mockResolvedValue(
        err({ code: 'PAYMENT_PROVIDER_ERROR', message: 'down' }),
      );

      const result = await adapter.getTransactionStatus('prov_tx_1');

      expect((result as Err<AppError>).error.code).toBe('PAYMENT_PROVIDER_ERROR');
    });
  });
});
