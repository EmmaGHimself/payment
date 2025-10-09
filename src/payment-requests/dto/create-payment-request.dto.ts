import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsEnum,
  Min,
} from 'class-validator';
import { PAYMENT_REQUEST_STATUS } from '../../common/constants/status.constants';

export class CreatePaymentRequestDto {
  @ApiProperty({ description: 'Payment request title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Payment request description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Payment amount', required: false })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @ApiProperty({
    description: 'Payment request status',
    enum: PAYMENT_REQUEST_STATUS,
  })
  @IsEnum(PAYMENT_REQUEST_STATUS)
  status: string;

  @ApiProperty({ description: 'Fee bearer', required: false })
  @IsString()
  @IsOptional()
  bearer?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
