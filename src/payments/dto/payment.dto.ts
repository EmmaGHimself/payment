import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEmail, IsOptional, Length, Matches } from 'class-validator';

export class CardPaymentDto {
  @ApiProperty({ description: 'Payment identifier' })
  @IsString()
  identifier: string;

  @ApiProperty({ description: 'Charge info ID' })
  @IsNumber()
  charge_info_id: number;

  @ApiProperty({ description: 'Card number' })
  @IsString()
  @Length(13, 19)
  pan: string;

  @ApiProperty({ description: 'Card CVV' })
  @IsString()
  @Length(3, 4)
  cvv: string;

  @ApiProperty({ description: 'Card expiry (MMYY)' })
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/, { message: 'Expiry must be in MMYY format' })
  expiry: string;

  @ApiProperty({ description: 'Card PIN', required: false })
  @IsString()
  @IsOptional()
  pin?: string;

  @ApiProperty({ description: 'Save card for future use', required: false })
  @IsOptional()
  save_card?: boolean;

  @ApiProperty({ description: 'Use specific service', required: false })
  @IsString()
  @IsOptional()
  use_service?: string;
}

export class TransferPaymentDto {
  @ApiProperty({ description: 'Payment identifier' })
  @IsString()
  identifier: string;

  @ApiProperty({ description: 'Charge info ID' })
  @IsNumber()
  charge_info_id: number;

  @ApiProperty({ description: 'Customer name' })
  @IsString()
  customer_name: string;

  @ApiProperty({ description: 'Payment description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsOptional()
  metadata?: Array<{ name: string; value: any }>;

  @ApiProperty({ description: 'Phone number' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Email address' })
  @IsString()
  email: string;

  _csrf?: string;

  name?: string;
}

export class MobilePaymentDto {
  @ApiProperty({ description: 'Payment identifier' })
  @IsString()
  identifier: string;

  @ApiProperty({ description: 'Charge info ID' })
  @IsNumber()
  charge_info_id: number;

  @ApiProperty({ description: 'Phone number' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Mobile money provider' })
  @IsString()
  provider: string;
}
