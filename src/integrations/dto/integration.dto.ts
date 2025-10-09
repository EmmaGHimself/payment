import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsUrl,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateIntegrationDto {
  @ApiProperty({ description: 'Integration name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Integration description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Identity/company identifier' })
  @IsString()
  identity: string;

  @ApiProperty({ description: 'Integration configurations', required: false })
  @IsObject()
  @IsOptional()
  configs?: Record<string, any>;
}

export class UpdateIntegrationDto {
  @ApiProperty({ description: 'Integration name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Integration description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Integration status', enum: ['enabled', 'disabled'], required: false })
  @IsEnum(['enabled', 'disabled'])
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'Integration configurations', required: false })
  @IsObject()
  @IsOptional()
  configs?: Record<string, any>;
}

export class IntegrationConfigDto {
  @ApiProperty({ description: 'Logo URL', required: false })
  @IsUrl()
  @IsOptional()
  logo_url?: string;

  @ApiProperty({ description: 'Channel configuration', required: false })
  @IsObject()
  @IsOptional()
  channel_config?: Record<string, any>;

  @ApiProperty({ description: 'Amount limit', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount_limit?: number;

  @ApiProperty({ description: 'Fee bearer', enum: ['client', 'merchant'], required: false })
  @IsEnum(['client', 'merchant'])
  @IsOptional()
  fee_bearer?: string;

  @ApiProperty({ description: 'Referrer code', required: false })
  @IsString()
  @IsOptional()
  referrer_code?: string;

  @ApiProperty({ description: 'Legacy merchant ID', required: false })
  @IsString()
  @IsOptional()
  legacy_merchant_id?: string;

  @ApiProperty({ description: 'Webhook URL', required: false })
  @IsUrl()
  @IsOptional()
  webhook_url?: string;

  @ApiProperty({ description: 'Rate limiting - requests per minute', required: false })
  @IsNumber()
  @Min(1)
  @Max(10000)
  @IsOptional()
  rate_limit?: number;
}