import { Injectable } from '@nestjs/common';
import type { Customer as PrismaCustomer } from '@prisma/client';
import type { Customer } from '../../../../domain/entities';
import type {
  CustomerRepositoryPort,
  UpsertCustomerInput,
} from '../../../../domain/ports';
import { AppError } from '../../../../shared/errors';
import { Result, err, ok } from '../../../../shared/railway';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaCustomerRepositoryAdapter implements CustomerRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  public async upsert(
    input: UpsertCustomerInput,
  ): Promise<Result<Customer, AppError>> {
    try {
      const customer = await this.prisma.customer.upsert({
        where: { email: input.email },
        create: {
          email: input.email,
          fullName: input.fullName,
          phone: input.phone ?? null,
        },
        update: {
          fullName: input.fullName,
          phone: input.phone ?? undefined,
        },
      });

      return ok(this.toDomain(customer));
    } catch (cause) {
      return err({
        code: 'PERSISTENCE_ERROR',
        message: 'Failed to upsert customer.',
        details: cause,
      });
    }
  }

  public async findByEmail(
    email: string,
  ): Promise<Result<Customer | null, AppError>> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { email },
      });

      return ok(customer ? this.toDomain(customer) : null);
    } catch (cause) {
      return err({
        code: 'PERSISTENCE_ERROR',
        message: 'Failed to fetch customer by email.',
        details: cause,
      });
    }
  }

  private toDomain(record: PrismaCustomer): Customer {
    return {
      id: record.id,
      email: record.email,
      fullName: record.fullName,
      phone: record.phone ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
