import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfigService } from '../../../../src/infrastructure/config/app-config.service';

describe('AppConfigService', () => {
  const build = (env: Record<string, string | undefined>): AppConfigService => {
    const configService = {
      get: (key: string) => env[key],
    } as unknown as ConfigService;

    return new AppConfigService(configService);
  };

  describe('required variables', () => {
    it('returns the value when present', () => {
      const config = build({ DATABASE_URL: 'postgres://db' });

      expect(config.databaseUrl).toBe('postgres://db');
    });

    it('throws when a required variable is missing', () => {
      const config = build({});

      expect(() => config.paymentsPrivateKey).toThrow(
        'Missing required environment variable: PAYMENTS_PRIVATE_KEY',
      );
    });

    it('throws when a required variable is blank', () => {
      const config = build({ PAYMENTS_BASE_URL: '   ' });

      expect(() => config.paymentsBaseUrl).toThrow(
        'Missing required environment variable: PAYMENTS_BASE_URL',
      );
    });
  });

  describe('optional acceptance token', () => {
    it('returns the value when present', () => {
      const config = build({ PAYMENTS_ACCEPTANCE_TOKEN: 'tok_123' });

      expect(config.paymentsAcceptanceToken).toBe('tok_123');
    });

    it('returns undefined when absent or blank', () => {
      expect(build({}).paymentsAcceptanceToken).toBeUndefined();
      expect(
        build({ PAYMENTS_ACCEPTANCE_TOKEN: '' }).paymentsAcceptanceToken,
      ).toBeUndefined();
    });
  });

  describe('port', () => {
    it('parses PORT when valid', () => {
      expect(build({ PORT: '4000' }).port).toBe(4000);
    });

    it('falls back to 3000 when missing or invalid', () => {
      expect(build({}).port).toBe(3000);
      expect(build({ PORT: 'abc' }).port).toBe(3000);
    });
  });

  describe('fees', () => {
    it('parses configured fees', () => {
      const config = build({
        BASE_FEE_IN_CENTS: '1500',
        DELIVERY_FEE_IN_CENTS: '900',
      });

      expect(config.baseFeeInCents).toBe(1500);
      expect(config.deliveryFeeInCents).toBe(900);
    });

    it('defaults fees to 0 when unset or invalid', () => {
      expect(build({}).baseFeeInCents).toBe(0);
      expect(build({ DELIVERY_FEE_IN_CENTS: 'x' }).deliveryFeeInCents).toBe(0);
    });
  });

  describe('hardening', () => {
    it('parses a CSV of CORS origins', () => {
      const config = build({ CORS_ORIGINS: 'https://a.com, https://b.com' });

      expect(config.corsOrigins).toEqual(['https://a.com', 'https://b.com']);
    });

    it('falls back to the localhost origin when unset', () => {
      expect(build({}).corsOrigins).toEqual(['http://localhost:5173']);
    });

    it('reads rate-limit settings with defaults', () => {
      expect(build({}).rateLimitWindowMs).toBe(60000);
      expect(build({}).rateLimitMaxRequests).toBe(120);
      expect(build({ RATE_LIMIT_MAX_REQUESTS: '50' }).rateLimitMaxRequests).toBe(50);
    });
  });

  describe('dependency injection', () => {
    it('resolves from a Nest module with ConfigModule', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true })],
        providers: [AppConfigService],
      }).compile();

      const config = moduleRef.get(AppConfigService);

      expect(config).toBeInstanceOf(AppConfigService);
      expect(config.port).toBe(3000);
    });
  });
});
