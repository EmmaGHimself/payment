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

interface WebhookResult {
  event: string;
  processed: boolean;
  charge_id: number;
}

interface ChargeHistoryData {
  description: string;
  responseMessage: string;
  status: string;
  activity: string;
  response?: any;
}

@Injectable()
export class PaystackWebhookHandler {
  private readonly logger = new Logger(PaystackWebhookHandler.name);

  constructor(
    @InjectRepository(ChargeEntity)
    private readonly chargeRepository: Repository<ChargeEntity>,
    @InjectRepository(ChargeHistoryEntity)
    private readonly chargeHistoryRepository: Repository<ChargeHistoryEntity>,
    @InjectRepository(ChargeMetadataEntity)
    private readonly chargeMetadataRepository: Repository<ChargeMetadataEntity>,
    private readonly configService: ConfigService,
  ) {}

  async handle(
    payload: PaystackWebhookDto,
    signature: string,
    rawBody: Buffer,
  ): Promise<WebhookResult> {
    if (!this.verifySignature(rawBody, signature)) {
      throw new PaymentException(
        'Invalid webhook signature',
        401,
        ERROR_CODES.AUTHENTICATION_ERROR,
      );
    }

    const charge = await this.findChargeByPaystackReference(payload.data.reference);
    if (!charge) {
      throw new PaymentException('Charge not found', 404, ERROR_CODES.TRANSACTION_NOT_FOUND);
    }

    const isSuccessful = this.isSuccessfulEvent(payload);

    await this.logChargeHistory(charge.id, {
      description: `Paystack webhook: ${payload.event}`,
      responseMessage: payload.data.status,
      status: isSuccessful ? CHARGE_STATUS.SUCCESSFUL : CHARGE_STATUS.FAILED,
      activity: 'PAYSTACK_WEBHOOK',
      response: payload,
    });

    if (isSuccessful && !charge.successful) {
      await this.markChargeAsSuccessful(charge);
    }

    return {
      event: payload.event,
      processed: true,
      charge_id: charge.id,
    };
  }

  private verifySignature(rawBody: Buffer, signature: string): boolean {
    const secretKey = this.configService.get<string>('payment.providers.paystack.webhookSecret');
    if (!secretKey) {
      this.logger.warn('Paystack webhook secret not configured');
      return false;
    }

    const hash = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
    return hash === signature;
  }

  private async findChargeByPaystackReference(reference: string): Promise<ChargeEntity | null> {
    const chargeByIdentifier = await this.chargeRepository.findOne({
      where: { identifier: reference },
    });
    if (chargeByIdentifier) return chargeByIdentifier;

    const metadata = await this.chargeMetadataRepository.findOne({
      where: { name: 'paystack_charge_reference', value: reference },
      relations: ['charge'],
    });

    return metadata?.charge || null;
  }

  private isSuccessfulEvent(payload: PaystackWebhookDto): boolean {
    return (
      payload.event === 'charge.success' ||
      (payload.event === 'charge.completed' && payload.data.status === 'success')
    );
  }

  private async markChargeAsSuccessful(charge: ChargeEntity): Promise<void> {
    await this.chargeRepository.update(charge.id, {
      status: CHARGE_STATUS.SUCCESSFUL,
      successful: true,
    });
  }

  private async logChargeHistory(chargeId: number, data: ChargeHistoryData): Promise<void> {
    const history = this.chargeHistoryRepository.create({
      chargeId,
      description: data.description,
      responseMessage: data.responseMessage,
      status: { name: data.status } as any,
      activity: data.activity,
      response: data.response ? JSON.stringify(data.response) : null,
    });
    await this.chargeHistoryRepository.save(history);
  }
}
