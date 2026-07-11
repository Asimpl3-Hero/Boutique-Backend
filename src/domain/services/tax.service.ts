import { AppError } from '../../shared/errors';
import { Result, err, ok } from '../../shared/railway';

export interface TaxBreakdown {
  /** Taxable base (total minus the included tax). */
  taxableInCents: number;
  /** Tax portion included in the total. */
  taxInCents: number;
  /** Rate applied, as an integer percentage (e.g. 18). */
  ratePercent: number;
}

/**
 * VAT-included pricing: product prices are final, so the charged amount
 * never changes — the tax is broken OUT of the total, never added on top.
 * taxable = round(total × 100 / (100 + rate)); tax = total − taxable.
 */
export class TaxService {
  public breakdownIncludedTax(
    totalInCents: number,
    ratePercent: number,
  ): Result<TaxBreakdown, AppError> {
    if (!Number.isInteger(totalInCents) || totalInCents <= 0) {
      return err({
        code: 'VALIDATION_ERROR',
        message: 'totalInCents must be a positive integer.',
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

    const taxableInCents = Math.round(
      (totalInCents * 100) / (100 + ratePercent),
    );

    return ok({
      taxableInCents,
      taxInCents: totalInCents - taxableInCents,
      ratePercent,
    });
  }
}
