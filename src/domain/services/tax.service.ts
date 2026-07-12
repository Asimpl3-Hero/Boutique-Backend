import { AppError } from '../../shared/errors';
import { Result, err, ok } from '../../shared/railway';

export interface TaxBreakdown {
  /** Taxable base the rate was applied to (pre-tax amount). */
  taxableInCents: number;
  /** Tax added ON TOP of the base. */
  taxInCents: number;
  /** Base + tax: the amount actually charged. */
  totalInCents: number;
  /** Rate applied, as an integer percentage (e.g. 18). */
  ratePercent: number;
}

/**
 * VAT-on-top pricing: product prices are the taxable base, so the tax is
 * ADDED to the total charged. tax = round(base × rate / 100).
 */
export class TaxService {
  public taxOnBase(
    baseInCents: number,
    ratePercent: number,
  ): Result<TaxBreakdown, AppError> {
    if (!Number.isInteger(baseInCents) || baseInCents <= 0) {
      return err({
        code: 'VALIDATION_ERROR',
        message: 'baseInCents must be a positive integer.',
      });
    }

    if (
      !Number.isInteger(ratePercent) ||
      ratePercent < 0 ||
      ratePercent >= 100
    ) {
      return err({
        code: 'VALIDATION_ERROR',
        message: 'ratePercent must be an integer in the [0, 100) range.',
      });
    }

    const taxInCents = Math.round((baseInCents * ratePercent) / 100);

    return ok({
      taxableInCents: baseInCents,
      taxInCents,
      totalInCents: baseInCents + taxInCents,
      ratePercent,
    });
  }
}
