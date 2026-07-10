import { PaymentMethodMapper } from '../../../../../src/infrastructure/adapters/outbound/payments/payment-method.mapper';
import { Ok, Err } from '../../../../../src/shared/railway';
import { AppError } from '../../../../../src/shared/errors';

describe('PaymentMethodMapper', () => {
  const mapper = new PaymentMethodMapper();

  it('maps a valid card token to a provider payment method', () => {
    const result = mapper.map({ type: 'CARD', cardToken: 'tok_123' });

    expect((result as Ok<Record<string, unknown>>).value).toEqual({
      type: 'CARD',
      token: 'tok_123',
      installments: 1,
    });
  });

  it('honours installments when provided', () => {
    const result = mapper.map({
      type: 'CARD',
      cardToken: 'tok_123',
      installments: 3,
    });

    expect((result as Ok<Record<string, unknown>>).value.installments).toBe(3);
  });

  it.each(['', '   ', 'REPLACE_ME', 'placeholder-token'])(
    'rejects missing/placeholder token: %p',
    (token) => {
      const result = mapper.map({ type: 'CARD', cardToken: token });
      expect((result as Err<AppError>).error.code).toBe('VALIDATION_ERROR');
    },
  );
});
