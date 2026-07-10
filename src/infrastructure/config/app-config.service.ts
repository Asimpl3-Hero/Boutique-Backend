import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_PORT = 3000;

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  public get port(): number {
    const value = this.configService.get<string>('PORT');
    const parsed = value ? Number.parseInt(value, 10) : DEFAULT_PORT;
    return Number.isNaN(parsed) ? DEFAULT_PORT : parsed;
  }

  public get databaseUrl(): string {
    return this.required('DATABASE_URL');
  }

  public get paymentsBaseUrl(): string {
    return this.required('PAYMENTS_BASE_URL');
  }

  public get paymentsPublicKey(): string {
    return this.required('PAYMENTS_PUBLIC_KEY');
  }

  public get paymentsPrivateKey(): string {
    return this.required('PAYMENTS_PRIVATE_KEY');
  }

  public get paymentsIntegritySecret(): string {
    return this.required('PAYMENTS_INTEGRITY_SECRET');
  }

  public get paymentsAcceptanceToken(): string | undefined {
    return this.optional('PAYMENTS_ACCEPTANCE_TOKEN');
  }

  public get baseFeeInCents(): number {
    return this.intOrDefault('BASE_FEE_IN_CENTS', 0);
  }

  public get deliveryFeeInCents(): number {
    return this.intOrDefault('DELIVERY_FEE_IN_CENTS', 0);
  }

  private required(key: string): string {
    const value = this.configService.get<string>(key);

    if (!value || value.trim() === '') {
      throw new Error(`Missing required environment variable: ${key}`);
    }

    return value;
  }

  private optional(key: string): string | undefined {
    const value = this.configService.get<string>(key);
    return value && value.trim() !== '' ? value : undefined;
  }

  private intOrDefault(key: string, fallback: number): number {
    const value = this.configService.get<string>(key);

    if (!value) {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
}
