import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/unit/**/*.spec.ts',
    '<rootDir>/tests/integration/**/*.spec.ts',
  ],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/app.module.ts',
    '!src/infrastructure/adapters/outbound/persistence/prisma.service.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.port.ts',
    '!src/**/*.dto.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
};

export default config;
