import { OrderStatus } from '../../entities';
import { AppError } from '../../../shared/errors';
import { Result } from '../../../shared/railway';

export const PAYMENT_GATEWAY_PORT = Symbol('PAYMENT_GATEWAY_PORT');

export interface CardPaymentMethodInput {
  type: 'CARD';
  cardToken: string;
  installments?: number;
}

export type PaymentMethodInput = CardPaymentMethodInput;

export interface CreateProviderTransactionInput {
  orderReference: string;
  amountInCents: number;
  currency: string;
  customerEmail: string;
  paymentMethod: PaymentMethodInput;
}

export interface CreatedProviderTransaction {
  transactionId: string;
  checkoutUrl: string | null;
  providerStatus: string;
}

export interface ProviderTransactionStatus {
  providerStatus: string;
  orderStatus: OrderStatus;
}

export interface PaymentGatewayPort {
  createTransaction(
    input: CreateProviderTransactionInput,
  ): Promise<Result<CreatedProviderTransaction, AppError>>;
  getTransactionStatus(
    transactionId: string,
  ): Promise<Result<ProviderTransactionStatus, AppError>>;
}
