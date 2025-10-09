import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsObject, IsUrl } from 'class-validator';

export class CreateMerchantDto {
  @ApiProperty({ description: 'External merchant ID' })
  @IsString()
  externalId: string;

  @ApiProperty({ description: 'Merchant business name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Merchant email', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Merchant phone number', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Merchant logo URL', required: false })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({ description: 'Webhook URL for notifications', required: false })
  @IsUrl()
  @IsOptional()
  webhookUrl?: string;

  @ApiProperty({ description: 'Additional merchant configurations', required: false })
  @IsObject()
  @IsOptional()
  configs?: Record<string, any>;
}