import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationEntity } from '../../database/entities/integration.entity';

interface AuthenticatedRequest extends Request {
  integration?: IntegrationEntity;
}

@Injectable()
export class MerchantGuard implements CanActivate {
  constructor(
    @InjectRepository(IntegrationEntity)
    private readonly integrationRepository: Repository<IntegrationEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    
    const secretKey = request.headers['integration-secret-key'] as string;
    
    if (!secretKey) {
      throw new UnauthorizedException('Integration secret key is required');
    }

    const integration = await this.integrationRepository.findOne({
      where: { secretKey },
    });

    if (!integration) {
      throw new UnauthorizedException('Invalid integration credentials');
    }

    if (integration.status !== 'enabled') {
      throw new UnauthorizedException('Integration is not enabled');
    }

    // Attach integration to request
    request.integration = integration;
    
    return true;
  }
}