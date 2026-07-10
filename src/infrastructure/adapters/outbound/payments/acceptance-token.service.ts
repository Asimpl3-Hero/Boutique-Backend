import { Injectable } from '@nestjs/common';
import { AppError } from '../../../../shared/errors';
import { Ok, Result, err, ok } from '../../../../shared/railway';
import { AppConfigService } from '../../../config/app-config.service';
import { PaymentHttpClient } from './payment-http.client';

interface MerchantResponse {
  data?: {
    presigned_acceptance?: {
      acceptance_token?: string;
    };
    presigned_personal_data_auth?: {
      acceptance_token?: string;
    };
  };
}

@Injectable()
export class AcceptanceTokenService {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly httpClient: PaymentHttpClient,
  ) {}

  /**
   * Returns a fresh acceptance token. Uses the configured override when present,
   * otherwise fetches it from the public merchants endpoint (public key auth).
   */
  public async resolve(): Promise<Result<string, AppError>> {
    const configuredToken = this.appConfig.paymentsAcceptanceToken?.trim();
    if (configuredToken && !this.isPlaceholder(configuredToken)) {
      return ok(configuredToken);
    }

    const merchantResult = await this.httpClient.request<MerchantResponse>(
      `/merchants/${this.appConfig.paymentsPublicKey}`,
      { method: 'GET' },
      'none',
    );

    if (merchantResult.isErr()) {
      return merchantResult;
    }

    const merchant = (merchantResult as Ok<MerchantResponse>).value;
    const acceptanceToken =
      merchant.data?.presigned_acceptance?.acceptance_token ??
      merchant.data?.presigned_personal_data_auth?.acceptance_token;

    if (!acceptanceToken) {
      return err({
        code: 'PAYMENT_PROVIDER_ERROR',
        message: 'Merchant response did not include an acceptance token.',
        details: merchant,
      });
    }

    return ok(acceptanceToken);
  }

  private isPlaceholder(value: string): boolean {
    const normalized = value.toLowerCase();
    return normalized.includes('placeholder') || normalized.includes('replace_me');
  }
}
