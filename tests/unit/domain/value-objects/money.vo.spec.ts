import { Money } from '../../../../src/domain/value-objects';
import { Ok, Err } from '../../../../src/shared/railway';
import { AppError } from '../../../../src/shared/errors';

describe('Money value object', () => {
  describe('valid input', () => {
    it('creates Money and upppercases the currency', () => {
      const result = Money.create(1500, 'cop');

      expect(result.isOk()).toBe(true);
      const money = (result as Ok<Money>).value;
      expect(money.amountInCents).toBe(1500);
      expect(money.currency).toBe('COP');
    });

    it('trims surrounding whitespace in the currency', () => {
      const result = Money.create(100, ' usd ');

      expect((result as Ok<Money>).value.currency).toBe('USD');
    });
  });

  describe('invalid amount', () => {
    it.each([0, -1, 10.5, Number.NaN])(
      'rejects non-positive or non-integer amount: %p',
      (amount) => {
        const result = Money.create(amount, 'COP');

        expect(result.isErr()).toBe(true);
        expect((result as Err<AppError>).error.code).toBe('VALIDATION_ERROR');
      },
    );
  });

  describe('invalid currency', () => {
    it.each(['', 'US', 'DOLLAR', '  '])(
      'rejects a non 3-letter currency: %p',
      (currency) => {
        const result = Money.create(1000, currency);

        expect(result.isErr()).toBe(true);
        expect((result as Err<AppError>).error.code).toBe('VALIDATION_ERROR');
      },
    );
  });
});
