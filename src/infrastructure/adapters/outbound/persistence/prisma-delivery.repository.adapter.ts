import { Injectable } from '@nestjs/common';
import type { Delivery as PrismaDelivery } from '@prisma/client';
import type { Delivery } from '../../../../domain/entities';
import type {
  CreateDeliveryInput,
  DeliveryRepositoryPort,
} from '../../../../domain/ports';
import { AppError } from '../../../../shared/errors';
import { Result, err, ok } from '../../../../shared/railway';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaDeliveryRepositoryAdapter implements DeliveryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  public async create(
    input: CreateDeliveryInput,
  ): Promise<Result<Delivery, AppError>> {
    try {
      const delivery = await this.prisma.delivery.create({
        data: {
          orderId: input.orderId,
          fullName: input.shippingData.fullName,
          email: input.shippingData.email,
          phone: input.shippingData.phone ?? null,
          address1: input.shippingData.address1,
          address2: input.shippingData.address2 ?? null,
          city: input.shippingData.city,
          state: input.shippingData.state,
          zip: input.shippingData.zip,
          country: input.shippingData.country ?? null,
        },
      });

      return ok(this.toDomain(delivery));
    } catch (cause) {
      return err({
        code: 'PERSISTENCE_ERROR',
        message: 'Failed to create delivery.',
        details: cause,
      });
    }
  }

  public async findByOrderId(
    orderId: string,
  ): Promise<Result<Delivery | null, AppError>> {
    try {
      const delivery = await this.prisma.delivery.findUnique({
        where: { orderId },
      });

      return ok(delivery ? this.toDomain(delivery) : null);
    } catch (cause) {
      return err({
        code: 'PERSISTENCE_ERROR',
        message: 'Failed to fetch delivery by order id.',
        details: cause,
      });
    }
  }

  private toDomain(record: PrismaDelivery): Delivery {
    return {
      id: record.id,
      orderId: record.orderId,
      fullName: record.fullName,
      email: record.email,
      phone: record.phone ?? undefined,
      address1: record.address1,
      address2: record.address2 ?? undefined,
      city: record.city,
      state: record.state,
      zip: record.zip,
      country: record.country ?? undefined,
      createdAt: record.createdAt,
    };
  }
}
