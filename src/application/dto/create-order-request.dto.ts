import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class PaymentMethodDataDto {
  @IsOptional()
  @IsString()
  public cardToken?: string;
}

export class ShippingDataDto {
  @IsString()
  public fullName!: string;

  @IsEmail()
  public email!: string;

  @IsOptional()
  @IsString()
  public phone?: string;

  @IsString()
  public address1!: string;

  @IsOptional()
  @IsString()
  public address2?: string;

  @IsString()
  public city!: string;

  @IsString()
  public state!: string;

  @IsString()
  public zip!: string;

  @IsOptional()
  @IsString()
  public country?: string;
}

export class CreateOrderRequestDto {
  @IsUUID()
  public productId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public quantity?: number;

  @IsEmail()
  public customerEmail!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentMethodDataDto)
  public paymentMethodData?: PaymentMethodDataDto;

  @ValidateNested()
  @Type(() => ShippingDataDto)
  public shippingData!: ShippingDataDto;
}
