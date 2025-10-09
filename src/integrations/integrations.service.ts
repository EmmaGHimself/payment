import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationEntity } from '../database/entities/integration.entity';
import { ChargeEntity } from '../database/entities/charge.entity';
import { ChargeInfoEntity } from '../database/entities/charge-info.entity';
import { CreateIntegrationDto, UpdateIntegrationDto, IntegrationConfigDto } from './dto/integration.dto';
import { HashUtil } from '../common/utils/hash.util';
import { ERROR_MESSAGES, ERROR_CODES } from '../common/constants/error.constants';
import { PaymentException } from '../common/exceptions/payment.exception';

export interface IntegrationStats {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  totalVolume: number;
  averageTransactionAmount: number;
  lastTransactionDate?: Date;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    @InjectRepository(IntegrationEntity)
    private readonly integrationRepository: Repository<IntegrationEntity>,
    @InjectRepository(ChargeEntity)
    private readonly chargeRepository: Repository<ChargeEntity>,
    @InjectRepository(ChargeInfoEntity)
    private readonly chargeInfoRepository: Repository<ChargeInfoEntity>,
  ) {}

  async create(createIntegrationDto: CreateIntegrationDto): Promise<IntegrationEntity> {
    // Check for duplicate name
    const existingIntegration = await this.integrationRepository.findOne({
      where: { name: createIntegrationDto.name },
    });

    if (existingIntegration) {
      throw new ConflictException('Integration with this name already exists');
    }

    // Generate API keys
    const publicKey = `pk_${HashUtil.generateIdentifier(32)}`;
    const secretKey = `sk_${HashUtil.generateIdentifier(32)}`;

    const integration = this.integrationRepository.create({
      ...createIntegrationDto,
      publicKey,
      secretKey,
      status: 'enabled',
      configs: {
        ...createIntegrationDto.configs,
        created_by: 'system',
        created_at: new Date().toISOString(),
      },
    });

    const savedIntegration = await this.integrationRepository.save(integration);
    
    this.logger.log(`Integration created: ${savedIntegration.name} (${savedIntegration.id})`);
    
    return savedIntegration;
  }

  async findAll(page: number = 1, limit: number = 20): Promise<{
    data: IntegrationEntity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const [integrations, total] = await this.integrationRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: integrations.map(integration => this.sanitizeIntegration(integration)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<IntegrationEntity> {
    const integration = await this.integrationRepository.findOne({
      where: { id },
    });

    if (!integration) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND);
    }

    return this.sanitizeIntegration(integration);
  }

  async findByPublicKey(publicKey: string): Promise<IntegrationEntity> {
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

    return integration;
  }

  async findBySecretKey(secretKey: string): Promise<IntegrationEntity> {
    const integration = await this.integrationRepository.findOne({
      where: { secretKey, status: 'enabled' },
    });

    if (!integration) {
      throw new PaymentException(
        ERROR_MESSAGES.INVALID_INTEGRATION,
        401,
        ERROR_CODES.INVALID_INTEGRATION,
      );
    }

    return integration;
  }

  async update(id: number, updateIntegrationDto: UpdateIntegrationDto): Promise<IntegrationEntity> {
    const integration = await this.findOne(id);

    await this.integrationRepository.update(id, {
      ...updateIntegrationDto,
      configs: {
        ...integration.configs,
        ...updateIntegrationDto.configs
      },
    });

    const updatedIntegration = await this.integrationRepository.findOne({
      where: { id },
    });

    this.logger.log(`Integration updated: ${integration.name} (${id})`);
    
    return this.sanitizeIntegration(updatedIntegration);
  }

  async updateConfigs(id: number, configDto: IntegrationConfigDto): Promise<IntegrationEntity> {
    const integration = await this.findOne(id);

    await this.integrationRepository.update(id, {
      configs: {
        ...integration.configs
      },
    });

    const updatedIntegration = await this.integrationRepository.findOne({
      where: { id },
    });

    this.logger.log(`Integration configs updated: ${integration.name} (${id})`);
    
    return this.sanitizeIntegration(updatedIntegration);
  }

  async disable(id: number): Promise<void> {
    const integration = await this.findOne(id);

    await this.integrationRepository.update(id, {
      status: 'disabled',
      configs: {
        ...integration.configs
      },
    });

    this.logger.log(`Integration disabled: ${integration.name} (${id})`);
  }

  async enable(id: number): Promise<void> {
    const integration = await this.findOne(id);

    await this.integrationRepository.update(id, {
      status: 'enabled',
      configs: {
        ...integration.configs
      },
    });

    this.logger.log(`Integration enabled: ${integration.name} (${id})`);
  }

  async regenerateKeys(id: number): Promise<{ publicKey: string; secretKey: string }> {
    const integration = await this.findOne(id);

    const newPublicKey = `pk_${HashUtil.generateIdentifier(32)}`;
    const newSecretKey = `sk_${HashUtil.generateIdentifier(32)}`;

    await this.integrationRepository.update(id, {
      publicKey: newPublicKey,
      secretKey: newSecretKey,
      configs: {
        ...integration.configs
      },
    });

    this.logger.log(`Integration keys regenerated: ${integration.name} (${id})`);

    return {
      publicKey: newPublicKey,
      secretKey: newSecretKey,
    };
  }

  async getIntegrationStats(id: number): Promise<IntegrationStats> {
    const integration = await this.findOne(id);

    // Get stats from charge_infos related to this integration
    const chargeInfoQuery = this.chargeInfoRepository
      .createQueryBuilder('ci')
      .leftJoin('ci.charges', 'c')
      .where('ci.integration_id = :integrationId', { integrationId: id });

    const [totalTransactions, successfulTransactions, volumeResult, lastTransaction] = await Promise.all([
      chargeInfoQuery.clone().getCount(),
      chargeInfoQuery.clone().andWhere('c.successful = :successful', { successful: true }).getCount(),
      chargeInfoQuery
        .clone()
        .select('SUM(ci.amount)', 'totalVolume')
        .addSelect('AVG(ci.amount)', 'averageAmount')
        .getRawOne(),
      chargeInfoQuery
        .clone()
        .orderBy('ci.created_at', 'DESC')
        .limit(1)
        .getOne(),
    ]);

    const failedTransactions = totalTransactions - successfulTransactions;
    const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;

    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      successRate: Math.round(successRate * 100) / 100,
      totalVolume: parseFloat(volumeResult?.totalVolume || '0'),
      averageTransactionAmount: parseFloat(volumeResult?.averageAmount || '0'),
      lastTransactionDate: lastTransaction?.createdAt,
    };
  }

  async getIntegrationsByIdentity(identity: string): Promise<IntegrationEntity[]> {
    return this.integrationRepository.find({
      where: { identity },
      order: { createdAt: 'DESC' },
    });
  }

  private sanitizeIntegration(integration: IntegrationEntity): IntegrationEntity {
    // Remove sensitive information from response
    const sanitized = { ...integration };
    if (sanitized.secretKey) {
      sanitized.secretKey = `${sanitized.secretKey.substring(0, 8)}...`;
    }
    return sanitized;
  }
}
