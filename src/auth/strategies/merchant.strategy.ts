import { Strategy } from 'passport-custom';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class MerchantStrategy extends PassportStrategy(Strategy, 'merchant') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async validate(req: any): Promise<any> {
    const secretKey = req.headers['integration-secret-key'];
    
    if (!secretKey) {
      throw new UnauthorizedException('Integration secret key required');
    }

    const integration = await this.authService.validateIntegration(secretKey);
    
    if (!integration) {
      throw new UnauthorizedException('Invalid integration credentials');
    }

    return integration;
  }
}