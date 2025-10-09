import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEmail,
  IsOptional,
  IsObject,
  IsBoolean,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CurrencyCode, CURRENCY_CODES } from '../../common/constants/payment.constants';

export class InitiateChargeDto {
  @ApiProperty({ description: 'Payment amount', example: '10000' })
  @IsString()
  @Transform(({ value }) => value.toString())
  amount: string;

  @ApiProperty({ description: 'Payment description', example: 'Payment for services' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Hash for security verification' })
  @IsString()
  hash: string;

  @ApiProperty({ description: 'Merchant ID', required: false })
  @IsString()
  @IsOptional()
  merchant_id?: string;

  @ApiProperty({ description: 'Public key for authentication', required: false })
  @IsString()
  @IsOptional()
  public_key?: string;

  @ApiProperty({ description: 'Unique transaction reference' })
  @IsString()
  reference: string;

  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customer_id: string;

  @ApiProperty({ description: 'Customer email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Customer phone number', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Callback URL', required: false })
  @IsString()
  @IsOptional()
  callback?: string;

  @ApiProperty({ description: 'Settlement account', required: false })
  @IsString()
  @IsOptional()
  settlement_account?: string;

  /**
   * @argument - mode - either test or live
   */
  @ApiProperty({ description: 'Live mode flag', required: false, default: "live" })
  @IsString()
  @IsOptional()
  mode?: string;

  @ApiProperty({
    description: 'Currency code',
    enum: CURRENCY_CODES,
    default: CURRENCY_CODES.NGN,
    required: false,
  })
  @IsEnum(CURRENCY_CODES)
  @IsOptional()
  currency?: CurrencyCode;

  @ApiProperty({ description: 'Discount information', required: false })
  @IsObject()
  @IsOptional()
  discount?: {
    amount?: number;
    channel?: string;
    product_id?: string;
  };

  @ApiProperty({ description: 'Payment request identifier', required: false })
  @IsString()
  @IsOptional()
  paymentRequest?: string;

  @ApiProperty({ description: 'Use view mode', required: false })
  @IsBoolean()
  @IsOptional()
  use_view?: boolean;
}