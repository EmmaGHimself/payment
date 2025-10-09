import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class TransferWebhookDto {
  @ApiProperty({ description: 'Transaction identifier' })
  @IsString()
  identifier: string;

  @ApiProperty({ description: 'Transaction status' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Transaction amount', required: false })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiProperty({ description: 'Error message', required: false })
  @IsString()
  @IsOptional()
  errorMessage?: string;
}