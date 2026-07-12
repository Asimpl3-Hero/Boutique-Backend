import { TaxService, TaxBreakdown } from '../../../../src/domain/services';
import { Ok, Err } from '../../../../src/shared/railway';
import { AppError } from '../../../../src/shared/errors';

describe('TaxService', () => {
  const service = new TaxService();

  const breakdownOf = (baseInCents: number, ratePercent: number) =>
    (service.taxOnBase(baseInCents, ratePercent) as Ok<TaxBreakdown>).value;

  it('adds an 18% tax on top of the taxable base', () => {
    const result = service.taxOnBase(10000, 18);

    expect(result.isOk()).toBe(true);
    expect((result as Ok<TaxBreakdown>).value).toEqual({
      taxableInCents: 10000,
      taxInCents: 1800,
      totalInCents: 11800,
      ratePercent: 18,
    });
  });

  it('rounds to whole cents and the total is always base + tax', () => {
    // 9999 × 0.18 = 1799.82 → 1800.
    const breakdown = breakdownOf(9999, 18);

    expect(breakdown.taxInCents).toBe(1800);
    expect(breakdown.totalInCents).toBe(11799);
    expect(breakdown.taxableInCents + breakdown.taxInCents).toBe(
      breakdown.totalInCents,
    );
  });

  it('supports a 0% rate (no tax, total equals the base)', () => {
    expect(breakdownOf(5000, 0)).toEqual({
      taxableInCents: 5000,
      taxInCents: 0,
      totalInCents: 5000,
      ratePercent: 0,
    });
  });

  it.each([0, -100, 10.5])(
    'rejects a non-positive or fractional base (%p)',
    (base) => {
      const result = service.taxOnBase(base, 18);

      expect(result.isErr()).toBe(true);
      expect((result as Err<AppError>).error.code).toBe('VALIDATION_ERROR');
    },
  );

  it.each([-1, 100, 18.5])('rejects an out-of-range rate (%p)', (rate) => {
    const result = service.taxOnBase(10000, rate);

    expect(result.isErr()).toBe(true);
    expect((result as Err<AppError>).error.code).toBe('VALIDATION_ERROR');
  });
});
