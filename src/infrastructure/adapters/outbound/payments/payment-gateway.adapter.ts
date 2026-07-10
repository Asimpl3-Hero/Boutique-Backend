import { Injectable } from '@nestjs/common';
import type {
  CreatedProviderTransaction,
  CreateProviderTransactionInput,
  PaymentGatewayPort,
  ProviderTransactionStatus,
} from '../../../../domain/ports';
import { OrderStatusService } from '../../../../domain/services';
import { AppError } from '../../../../shared/errors';
import { Ok, Result, err, ok } from '../../../../shared/railway';
import { AcceptanceTokenService } from './acceptance-token.service';
import { PaymentHttpClient } from './payment-http.client';
import { IntegritySignatureService } from './integrity-signature.service';
import { PaymentMethodMapper } from './payment-method.mapper';

interface CreateTransactionResponse {
  data?: {
    id?: string;
    status?: string;
    checkout_url?: string;
  };
}

interface GetTransactionResponse {
  data?: {
    status?: string;
  };
}

@Injectable()
export class PaymentGatewayAdapter implements PaymentGatewayPort {
  constructor(
    private readonly orderStatusService: OrderStatusService,
    private readonly httpClient: PaymentHttpClient,
    private readonly acceptanceTokenService: AcceptanceTokenService,
    private readonly paymentMethodMapper: PaymentMethodMapper,
    private readonly integritySignatureService: IntegritySignatureService,
  ) {}

  public async createTransaction(
    input: CreateProviderTransactionInput,
  ): Promise<Result<CreatedProviderTransaction, AppError>> {
    const acceptanceTokenResult = await this.acceptanceTokenService.resolve();
    if (acceptanceTokenResult.isErr()) {
      return acceptanceTokenResult;
    }
    const acceptanceToken = (acceptanceTokenResult as Ok<string>).value;

    const paymentMethodResult = this.paymentMethodMapper.map(
      input.paymentMethod,
    );
    if (paymentMethodResult.isErr()) {
      return paymentMethodResult;
    }
    const paymentMethod = (
      paymentMethodResult as Ok<Record<string, unknown>>
    ).value;

    const signature = this.integritySignatureService.build(
      input.orderReference,
      input.amountInCents,
      input.currency,
    );

    const payload = {
      amount_in_cents: input.amountInCents,
      currency: input.currency,
      customer_email: input.customerEmail,
      reference: input.orderReference,
      signature,
      acceptance_token: acceptanceToken,
      payment_method: paymentMethod,
    };

    const responseResult =
      await this.httpClient.request<CreateTransactionResponse>(
        '/transactions',
        { method: 'POST', body: JSON.stringify(payload) },
        'private',
      );

    if (responseResult.isErr()) {
      return responseResult;
    }
    const responseData = (responseResult as Ok<CreateTransactionResponse>).value;

    const transactionId = responseData.data?.id;
    if (!transactionId) {
      return err({
        code: 'PAYMENT_PROVIDER_ERROR',
        message: 'Payment provider did not return a transaction id.',
        details: responseData,
      });
    }

    return ok({
      transactionId,
      checkoutUrl: responseData.data?.checkout_url ?? null,
      providerStatus: responseData.data?.status ?? 'PENDING',
    });
  }

  public async getTransactionStatus(
    transactionId: string,
  ): Promise<Result<ProviderTransactionStatus, AppError>> {
    const responseResult =
      await this.httpClient.request<GetTransactionResponse>(
        `/transactions/${transactionId}`,
        { method: 'GET' },
        'private',
      );

    if (responseResult.isErr()) {
      return responseResult;
    }
    const responseData = (responseResult as Ok<GetTransactionResponse>).value;

    const providerStatus = responseData.data?.status ?? 'PENDING';

    return ok({
      providerStatus,
      orderStatus: this.orderStatusService.mapProviderStatus(providerStatus),
    });
  }
}
