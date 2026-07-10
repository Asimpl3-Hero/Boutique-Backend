import { CreateOrderPaymentMethodResolver } from '../../../../src/application/services/create-order-payment-method.resolver';
import { Ok, Err } from '../../../../src/shared/railway';
import { AppError } from '../../../../src/shared/errors';
import { PaymentMethodInput } from '../../../../src/domain/ports';

describe('CreateOrderPaymentMethodResolver', () => {
  const resolver = new CreateOrderPaymentMethodResolver();

  it('resolves a CARD payment method from a card token', () => {
    const result = resolver.resolve({ cardToken: '  tok_abc  ' });

    const method = (result as Ok<PaymentMethodInput>).value;
    expect(method).toEqual({
      type: 'CARD',
      cardToken: 'tok_abc',
      installments: 1,
    });
  });

  it.each([undefined, {}, { cardToken: '   ' }])(
    'rejects missing/blank card token: %p',
    (input) => {
      const result = resolver.resolve(input);

      expect((result as Err<AppError>).error.code).toBe('VALIDATION_ERROR');
    },
  );
});
