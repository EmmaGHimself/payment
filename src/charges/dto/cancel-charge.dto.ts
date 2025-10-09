import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CancelChargeDto {
  @ApiProperty({ description: 'Transaction identifier' })
  @IsString()
  identifier: string;
}