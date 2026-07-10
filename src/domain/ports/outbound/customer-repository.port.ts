import { Customer } from '../../entities';
import { AppError } from '../../../shared/errors';
import { Result } from '../../../shared/railway';

export const CUSTOMER_REPOSITORY_PORT = Symbol('CUSTOMER_REPOSITORY_PORT');

export interface UpsertCustomerInput {
  email: string;
  fullName: string;
  phone?: string;
}

export interface CustomerRepositoryPort {
  upsert(input: UpsertCustomerInput): Promise<Result<Customer, AppError>>;
  findByEmail(email: string): Promise<Result<Customer | null, AppError>>;
}
