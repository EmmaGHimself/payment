import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional } from 'class-validator';

export class PaystackWebhookDto {
  @ApiProperty({ description: 'Event type' })
  @IsString()
  event: string;

  @ApiProperty({ description: 'Event data' })
  @IsObject()
  data: {
    reference: string;
    status: string;
    amount: number;
    currency: string;
    customer: {
      email: string;
    };
    metadata?: Record<string, any>;
    [key: string]: any;
  };
}