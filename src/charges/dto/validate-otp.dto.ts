import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ValidateOtpDto {
  @ApiProperty({ description: 'Transaction identifier' })
  @IsString()
  identifier: string;

  @ApiProperty({ description: 'OTP code' })
  @IsString()
  otp: string;
}