import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationEntity } from '../database/entities/integration.entity';
import { MerchantEntity } from '../database/entities/merchant.entity';
import { HashUtil } from '../common/utils/hash.util';

export interface TokenPayload {
  merchant_id?: string;
  email?: string;
  customer_id?: string;
  integration_id?: number;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(IntegrationEntity)
    private readonly integrationRepository: Repository<IntegrationEntity>,
    @InjectRepository(MerchantEntity)
    private readonly merchantRepository: Repository<MerchantEntity>,
  ) {}

  async generateToken(payload: TokenPayload): Promise<string> {
    return this.jwtService.sign(payload);
  }

  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async validateIntegration(secretKey: string): Promise<IntegrationEntity | null> {
    try {
      const integration = await this.integrationRepository.findOne({
        where: { secretKey, status: 'enabled' },
      });

      if (!integration) {
        this.logger.warn(`Invalid integration attempted: ${secretKey.substring(0, 8)}...`);
        return null;
      }

      return integration;
    } catch (error) {
      this.logger.error('Error validating integration:', error);
      return null;
    }
  }

  async validateMerchant(merchantId: string): Promise<MerchantEntity | null> {
    try {
      const merchant = await this.merchantRepository.findOne({
        where: { externalId: merchantId, status: 'enabled' },
      });

      return merchant;
    } catch (error) {
      this.logger.error('Error validating merchant:', error);
      return null;
    }
  }

  async createIntegration(data: {
    name: string;
    description?: string;
    identity: string;
    configs?: Record<string, any>;
  }): Promise<IntegrationEntity> {
    const integration = this.integrationRepository.create({
      ...data,
      publicKey: `pk_${HashUtil.generateIdentifier(32)}`,
      secretKey: `sk_${HashUtil.generateIdentifier(32)}`,
      status: 'enabled',
    });

    const savedIntegration = await this.integrationRepository.save(integration);
    
    this.logger.log(`Integration created: ${savedIntegration.name} (${savedIntegration.id})`);
    
    return savedIntegration;
  }
}