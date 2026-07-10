import { Injectable } from '@nestjs/common';
import { AppError } from '../../../../shared/errors';
import { Result, err, ok } from '../../../../shared/railway';
import { AppConfigService } from '../../../config/app-config.service';

export type PaymentRequestAuth = 'private' | 'none';

@Injectable()
export class PaymentHttpClient {
  constructor(private readonly appConfig: AppConfigService) {}

  public async request<T>(
    path: string,
    init: RequestInit,
    auth: PaymentRequestAuth,
  ): Promise<Result<T, AppError>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth === 'private') {
        headers.Authorization = `Bearer ${this.appConfig.paymentsPrivateKey}`;
      }

      const response = await fetch(`${this.appConfig.paymentsBaseUrl}${path}`, {
        ...init,
        headers: {
          ...headers,
          ...(init.headers ?? {}),
        },
      });

      const data = (await response.json().catch(() => ({}))) as T;

      if (!response.ok) {
        const isProviderDown = response.status >= 500;
        return err({
          code: isProviderDown ? 'PAYMENT_PROVIDER_ERROR' : 'VALIDATION_ERROR',
          message: isProviderDown
            ? `Payment provider request failed with status ${response.status}.`
            : `Payment provider rejected request with status ${response.status}.`,
          details: data,
        });
      }

      return ok(data);
    } catch (cause) {
      return err({
        code: 'PAYMENT_PROVIDER_ERROR',
        message: 'Payment provider request failed due to a network or parsing error.',
        details: cause,
      });
    }
  }
}
