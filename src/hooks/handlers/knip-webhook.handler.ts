import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { ChargeEntity } from '../../database/entities/charge.entity';
import { ChargeHistoryEntity } from '../../database/entities/charge-history.entity';
import { ChargeMetadataEntity } from '../../database/entities/charge-metadata.entity';
import { PaystackWebhookDto } from '../dto/paystack-webhook.dto';
import { CHARGE_STATUS } from '../../common/constants/status.constants';
import { PaymentException } from '../../common/exceptions/payment.exception';
import { ERROR_CODES } from '../../common/constants/error.constants';
import { ChargeInfoEntity } from '../../database/entities/charge-info.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigEntity } from '@/database/entities/config.entity';

@Injectable()
export class KnipWebhookHandler {
  private readonly logger = new Logger(KnipWebhookHandler.name);

  constructor(
    @InjectRepository(ChargeEntity)
    private readonly chargeRepository: Repository<ChargeEntity>,
    @InjectRepository(ChargeHistoryEntity)
    private readonly chargeHistoryRepository: Repository<ChargeHistoryEntity>,
    @InjectRepository(ChargeInfoEntity)
    private readonly chargeInfoRepository: Repository<ChargeInfoEntity>,
    @InjectRepository(ChargeMetadataEntity)
    private readonly chargeMetadataRepository: Repository<ChargeMetadataEntity>,
    private readonly configService: ConfigService,
    @InjectRepository(ConfigEntity) private readonly configRepository: Repository<ConfigEntity>,
    @InjectQueue('settle-charge') private readonly settleCharge: Queue,
  ) {}

  async handle(payload: any, rawBody: Buffer) {
    if (payload.status === 'success') {
      const charge = await this.chargeRepository.findOne({
        where: { identifier: payload.reference },
      });
      await this.logChargeHistory(charge.id, {
        description: `Knip webhook: ${payload.event}`,
        responseMessage: payload.status,
        status: CHARGE_STATUS.SUCCESSFUL,
        activity: 'KNIP_WEBHOOK',
        response: payload,
      });
      if (charge.status === CHARGE_STATUS.COMPLETED && charge.successful === true) {
        return { status: 'OK' };
      }
      await this.chargeMetadataRepository.save(
        this.chargeMetadataRepository.create([
          { name: 'knip_session_id', value: payload.session_id },
        ]),
      );
      await this.markChargeAsSuccessful(charge);
      return {
        event: payload.event,
        processed: true,
        charge_id: charge.id,
      };
    }
  }

  private isSuccessfulEvent(payload: any): boolean {
    return (
      payload.event === 'charge.success' ||
      (payload.event === 'charge.completed' && payload.data.status === 'success')
    );
  }

  private async markChargeAsSuccessful(charge: ChargeEntity): Promise<void> {
    await this.chargeRepository.update(
      { id: charge.id },
      { status: 'completed', successful: true },
    );
    // await this.settleCharge.add('settle', { charge_id: charge.id, settle: true });
  }

  private async logChargeHistory(
    chargeId: number,
    data: {
      description: string;
      responseMessage: string;
      status: string;
      activity: string;
      response?: any;
    },
  ): Promise<void> {
    const history = this.chargeHistoryRepository.create({
      chargeId,
      description: data.description,
      responseMessage: data.responseMessage,
      status: data.status as any, // Cast to match entity type
      activity: data.activity,
      response: data.response ? JSON.stringify(data.response) : null, // Convert to string
    });

    await this.chargeHistoryRepository.save(history);
  }
}
