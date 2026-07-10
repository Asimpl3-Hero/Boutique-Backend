import { Injectable } from '@nestjs/common';
import { PaymentMethodInput } from '../../../../domain/ports';
import { AppError } from '../../../../shared/errors';
import { Result, err, ok } from '../../../../shared/railway';

@Injectable()
export class PaymentMethodMapper {
  public map(
    input: PaymentMethodInput,
  ): Result<Record<string, unknown>, AppError> {
    const token = input.cardToken?.trim();

    if (!token || this.isPlaceholder(token)) {
      return err({
        code: 'VALIDATION_ERROR',
        message:
          'CARD payment requires paymentMethodData.cardToken generated on the client.',
      });
    }

    return ok({
      type: 'CARD',
      token,
      installments: input.installments ?? 1,
    });
  }

  private isPlaceholder(value: string): boolean {
    const normalized = value.toLowerCase();
    return normalized.includes('placeholder') || normalized.includes('replace_me');
  }
}
