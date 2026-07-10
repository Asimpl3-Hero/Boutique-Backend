import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AppConfigService } from '../../../config/app-config.service';

@Injectable()
export class IntegritySignatureService {
  constructor(private readonly appConfig: AppConfigService) {}

  public build(
    reference: string,
    amountInCents: number,
    currency: string,
  ): string {
    return createHash('sha256')
      .update(
        `${reference}${amountInCents}${currency}${this.appConfig.paymentsIntegritySecret}`,
      )
      .digest('hex');
  }
}
