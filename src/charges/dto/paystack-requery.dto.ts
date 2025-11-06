import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaystackRequeryDto {
  @ApiProperty({ description: 'Charge identifier' })
  @IsNotEmpty()
  @IsString()
  identifier: string;

  @ApiPropertyOptional({ description: 'Callback URL to redirect after requery' })
  @IsOptional()
  @IsString()
  callback?: string;

  @ApiProperty({ description: 'Charge Info Id' })
  @IsNotEmpty()
  @IsString()
  charge_info_id: string;

  @ApiPropertyOptional({ description: 'Token for redirect' })
  @IsOptional()
  @IsString()
  token?: string;
}
