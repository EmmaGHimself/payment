import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { MerchantEntity } from '../database/entities/merchant.entity';
import { IntegrationEntity } from '../database/entities/integration.entity';
import { CreateMerchantDto } from './dto/merchant.dto';
import { HashUtil } from '../common/utils/hash.util';
import { ERROR_MESSAGES, ERROR_CODES } from '../common/constants/error.constants';
import { PaymentException } from '../common/exceptions/payment.exception';

export interface MerchantResponse {
  id: number;
  externalId: string;
  name: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  status: string;
  livePublicKey?: string;
  testPublicKey?: string;
  webhookUrl?: string;
  configs?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MerchantsService {
  private readonly logger = new Logger(MerchantsService.name);

  constructor(
    @InjectRepository(MerchantEntity)
    private readonly merchantRepository: Repository<MerchantEntity>,
    @InjectRepository(IntegrationEntity)
    private readonly integrationRepository: Repository<IntegrationEntity>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async findByExternalId(externalId: string): Promise<MerchantResponse> {
    const merchant = await this.merchantRepository.findOne({
      where: { externalId, status: 'enabled' },
    });

    if (!merchant) {
      throw new NotFoundException(ERROR_MESSAGES.MERCHANT_NOT_FOUND);
    }

    return this.formatMerchantResponse(merchant);
  }

  async findByIntegrationKey(publicKey: string): Promise<MerchantResponse> {
    const integration = await this.integrationRepository.findOne({
      where: { publicKey, status: 'enabled' },
    });

    if (!integration) {
      throw new PaymentException(
        ERROR_MESSAGES.INVALID_INTEGRATION,
        401,
        ERROR_CODES.INVALID_INTEGRATION,
      );
    }

    // Create a merchant-like response from integration
    return {
      id: integration.id,
      externalId: integration.identity,
      name: integration.name,
      status: integration.status,
      configs: integration.configs,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };
  }

  async create(createMerchantDto: CreateMerchantDto): Promise<MerchantResponse> {
    const existingMerchant = await this.merchantRepository.findOne({
      where: { externalId: createMerchantDto.externalId },
    });

    if (existingMerchant) {
      throw new PaymentException(
        'Merchant with this external ID already exists',
        409,
        ERROR_CODES.CONFLICT,
      );
    }

    const merchant = this.merchantRepository.create({
      ...createMerchantDto,
      livePublicKey: `pk_live_${HashUtil.generateIdentifier(32)}`,
      testPublicKey: `pk_test_${HashUtil.generateIdentifier(32)}`,
      liveSecretKey: `sk_live_${HashUtil.generateIdentifier(32)}`,
      testSecretKey: `sk_test_${HashUtil.generateIdentifier(32)}`,
      status: 'enabled',
    });

    const savedMerchant = await this.merchantRepository.save(merchant);
    
    this.logger.log(`Merchant created: ${savedMerchant.name} (${savedMerchant.externalId})`);
    
    return this.formatMerchantResponse(savedMerchant);
  }

  async update(externalId: string, updateData: Partial<CreateMerchantDto>): Promise<MerchantResponse> {
    const merchant = await this.merchantRepository.findOne({
      where: { externalId },
    });

    if (!merchant) {
      throw new NotFoundException(ERROR_MESSAGES.MERCHANT_NOT_FOUND);
    }

    await this.merchantRepository.update({ id: merchant.id }, updateData);

    const updatedMerchant = await this.merchantRepository.findOne({
      where: { id: merchant.id },
    });

    this.logger.log(`Merchant updated: ${externalId}`);
    
    return this.formatMerchantResponse(updatedMerchant);
  }

  async validateMerchant(merchantId: string, livemode: boolean = true): Promise<boolean> {
    try {
      const merchant = await this.findByExternalId(merchantId);
      return merchant.status === 'enabled';
    } catch {
      return false;
    }
  }

  async getMerchantKeys(merchantId: string, livemode: boolean = true): Promise<{
    publicKey: string;
    secretKey?: string;
  }> {
    const merchant = await this.merchantRepository.findOne({
      where: { externalId: merchantId, status: 'enabled' },
    });

    if (!merchant) {
      throw new NotFoundException(ERROR_MESSAGES.MERCHANT_NOT_FOUND);
    }

    return {
      publicKey: livemode ? merchant.livePublicKey : merchant.testPublicKey,
      secretKey: livemode ? merchant.liveSecretKey : merchant.testSecretKey,
    };
  }

  // Integration with external merchant service (if exists)
  async fetchMerchantFromExternalService(merchantId: string): Promise<any> {
    try {
      const token = await this.getAuthToken();
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.configService.get('EXTERNAL_MERCHANT_API_URL')}/merchants/${merchantId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Source': 'payment-service',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch merchant from external service: ${merchantId}`, error);
      throw error;
    }
  }

  private async getAuthToken(): Promise<string> {
    // Implementation would depend on your auth service
    return 'dummy_token';
  }

  private formatMerchantResponse(merchant: MerchantEntity): MerchantResponse {
    return {
      id: merchant.id,
      externalId: merchant.externalId,
      name: merchant.name,
      email: merchant.email,
      phone: merchant.phone,
      logoUrl: merchant.logoUrl,
      status: merchant.status,
      livePublicKey: merchant.livePublicKey,
      testPublicKey: merchant.testPublicKey,
      webhookUrl: merchant.webhookUrl,
      configs: merchant.configs,
      createdAt: merchant.createdAt,
      updatedAt: merchant.updatedAt,
    };
  }
}
