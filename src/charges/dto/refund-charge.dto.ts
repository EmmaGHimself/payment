import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, IsBoolean, IsOptional } from 'class-validator';

export class RefundChargeDto {
  @ApiProperty({ description: 'Refund amount' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Transaction reference' })
  @IsString()
  reference: string;

  @ApiProperty({ description: 'Merchant ID' })
  @IsString()
  merchant_id: string;

  @ApiProperty({ description: 'Live mode flag', required: false })
  @IsBoolean()
  @IsOptional()
  live_mode?: boolean;
}
