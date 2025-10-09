import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsObject, IsOptional } from 'class-validator';

export class NotificationDto {
  @ApiProperty({ description: 'Notification type', enum: ['email', 'sms'] })
  @IsEnum(['email', 'sms'])
  type: 'email' | 'sms';

  @ApiProperty({ description: 'Recipient (email or phone)' })
  @IsString()
  recipient: string;

  @ApiProperty({ description: 'Subject (for emails)', required: false })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ description: 'Message (for SMS)', required: false })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({ description: 'Template name (for emails)', required: false })
  @IsString()
  @IsOptional()
  template?: string;

  @ApiProperty({ description: 'Template data', required: false })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}