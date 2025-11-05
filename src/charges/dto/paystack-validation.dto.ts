import { IsString, IsNotEmpty, IsObject, ValidateNested, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ValidationDataDto {
  @ApiPropertyOptional({ description: 'PIN code' })
  @IsOptional()
  @IsString()
  pin?: string;

  @ApiPropertyOptional({ description: 'OTP code' })
  @IsOptional()
  @IsString()
  otp?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Birthday' })
  @IsOptional()
  @IsString()
  birthday?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'ZIP code' })
  @IsOptional()
  @IsString()
  zipcode?: string;
}

export class PaystackValidationDto {
  @ApiPropertyOptional({ description: 'Charge identifier' })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiPropertyOptional({ description: 'Charge info ID (alternative to identifier)' })
  @IsOptional()
  @IsString()
  charge_info_id?: string;

  @ApiPropertyOptional({ description: 'Token for validation' })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiProperty({ description: 'Validation data containing PIN, OTP, phone, birthday, or address' })
  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => ValidationDataDto)
  validation: ValidationDataDto;
}
