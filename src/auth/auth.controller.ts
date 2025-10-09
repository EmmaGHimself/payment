import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('token')
  @ApiOperation({ summary: 'Generate authentication token' })
  @ApiResponse({ status: 201, description: 'Token generated successfully' })
  async generateToken(@Body() tokenData: {
    merchant_id?: string;
    email?: string;
    customer_id?: string;
  }) {
    const token = await this.authService.generateToken(tokenData);
    
    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 7200, // 2 hours
    };
  }

  @Post('integration')
  @ApiOperation({ summary: 'Create new integration' })
  @ApiResponse({ status: 201, description: 'Integration created successfully' })
  async createIntegration(@Body() integrationData: {
    name: string;
    description?: string;
    identity: string;
    configs?: Record<string, any>;
  }) {
    const integration = await this.authService.createIntegration(integrationData);
    
    return {
      id: integration.id,
      name: integration.name,
      public_key: integration.publicKey,
      secret_key: integration.secretKey,
      status: integration.status,
      created_at: integration.createdAt,
    };
  }
}