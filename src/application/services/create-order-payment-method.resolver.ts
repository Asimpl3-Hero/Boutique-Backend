import { Injectable } from '@nestjs/common';
import type { PaymentMethodInput } from '../../domain/ports';
import { AppError } from '../../shared/errors';
import { Result, err } from '../../shared/railway';

export interface CreateOrderPaymentMethodData {
  cardToken?: string;
}

@Injectable()
export class CreateOrderPaymentMethodResolver {
  public resolve(
    paymentMethodData?: CreateOrderPaymentMethodData,
  ): Result<PaymentMethodInput, AppError> {
    const cardToken = paymentMethodData?.cardToken?.trim();

    if (!cardToken) {
      return err({
        code: 'VALIDATION_ERROR',
        message: 'CARD payment requires paymentMethodData.cardToken.',
      });
    }

    return Result.ok({
      type: 'CARD',
      cardToken,
      installments: 1,
    });
  }
}
