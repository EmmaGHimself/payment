import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ChargeEntity } from '../database/entities/charge.entity';
import { ChargeHistoryEntity } from '../database/entities/charge-history.entity';
import { ChargeMetadataEntity } from '../database/entities/charge-metadata.entity';
import { RequestLogEntity } from '../database/entities/request-log.entity';
import { PaystackWebhookHandler } from './handlers/paystack-webhook.handler';
import { TransferWebhookHandler } from './handlers/transfer-webhook.handler';
import { KnipWebhookHandler } from './handlers/knip-webhook.handler';
import { PaystackWebhookDto } from './dto/paystack-webhook.dto';
import { TransferWebhookDto } from './dto/transfer-webhook.dto';
import { CHARGE_STATUS, WEBHOOK_EVENT_TYPES } from '../common/constants/status.constants';

interface WebhookResponse {
  status: 'OK';
}

interface RequestLogUpdate {
  charge_id?: number;
  processed?: boolean;
  error?: string;
  [key: string]: any;
}

@Injectable()
export class HooksService {
  private readonly logger = new Logger(HooksService.name);

  constructor(
    @InjectRepository(ChargeEntity)
    private readonly chargeRepository: Repository<ChargeEntity>,
    @InjectRepository(ChargeHistoryEntity)
    private readonly chargeHistoryRepository: Repository<ChargeHistoryEntity>,
    @InjectRepository(ChargeMetadataEntity)
    private readonly chargeMetadataRepository: Repository<ChargeMetadataEntity>,
    @InjectRepository(RequestLogEntity)
    private readonly requestLogRepository: Repository<RequestLogEntity>,
    @InjectQueue('settle-charge') private readonly settleCharge: Queue,
    private readonly paystackWebhookHandler: PaystackWebhookHandler,
    private readonly knipWebhookHandler: KnipWebhookHandler,
    private readonly transferWebhookHandler: TransferWebhookHandler,
  ) {}

  async handlePaystackWebhook(
    payload: PaystackWebhookDto,
    signature: string,
    rawBody: Buffer,
  ): Promise<WebhookResponse> {
    return this.processWebhook('paystack', async (requestLog) =>
      this.paystackWebhookHandler.handle(payload, signature, rawBody),
    );
  }

  async handleKnipWebhook(payload: any, body: any): Promise<WebhookResponse> {
    return this.processWebhook('knip', async (requestLog) =>
      this.knipWebhookHandler.handle(payload, body),
    );
  }

  async handleTransferWebhook(payload: TransferWebhookDto): Promise<WebhookResponse> {
    return this.processWebhook('transfer', async (requestLog) =>
      this.transferWebhookHandler.handle(payload),
    );
  }

  async handleKlumpWebhook(
    payload: any,
    signature: string,
    webhookId: string,
    attempt: string,
  ): Promise<WebhookResponse> {
    const requestLog = await this.logIncomingRequest('klump', 'webhook', payload);

    try {
      const charge = await this.chargeRepository.findOne({
        where: { identifier: payload.data?.merchant_reference },
      });

      if (!charge) {
        this.logger.warn(`Charge not found for Klump webhook: ${payload.data?.merchant_reference}`);
        return { status: 'OK' };
      }

      if (!this.verifyKlumpSignature(payload, signature)) {
        this.logger.warn('Invalid Klump webhook signature');
        return { status: 'OK' };
      }

      const isSuccessful =
        payload.event?.includes('successful') && payload.data?.status === 'successful';

      if (isSuccessful) {
        await this.processSuccessfulKlumpWebhook(
          charge,
          webhookId,
          attempt,
          payload.data.reference,
        );
      }

      await this.updateRequestLog(requestLog.id, { charge_id: charge.id, processed: true });
      return { status: 'OK' };
    } catch (error) {
      this.logger.error('Error processing Klump webhook:', error);
      await this.updateRequestLog(requestLog.id, { error: error.message });
      return { status: 'OK' };
    }
  }

  private async processWebhook(
    service: string,
    handler: (requestLog: RequestLogEntity) => Promise<any>,
  ): Promise<WebhookResponse> {
    const requestLog = await this.logIncomingRequest(service, 'webhook');
    try {
      const result = await handler(requestLog);
      await this.updateRequestLog(requestLog.id, result);
      return { status: 'OK' };
    } catch (error) {
      await this.updateRequestLog(requestLog.id, { error: error.message });
      throw error;
    }
  }

  private async processSuccessfulKlumpWebhook(
    charge: ChargeEntity,
    webhookId: string,
    attempt: string,
    reference: string,
  ): Promise<void> {
    const existingMetadata = await this.chargeMetadataRepository.findOne({
      where: { chargeId: charge.id, name: 'klump_webhook_id' },
    });

    if (existingMetadata?.value) {
      await this.saveChargeMetadata(charge.id, 'klump_attempts', attempt);
      return;
    }

    await Promise.all([
      this.saveChargeMetadata(charge.id, 'klump_webhook_id', webhookId),
      this.saveChargeMetadata(charge.id, 'klump_reference', reference),
      this.saveChargeMetadata(charge.id, 'klump_attempts', attempt),
      this.markChargeAsSuccessful(charge),
    ]);
  }

  private async logIncomingRequest(
    service: string,
    endpoint: string,
    payload?: any,
  ): Promise<RequestLogEntity> {
    const requestLog = this.requestLogRepository.create({
      service,
      endpoint,
      request: payload ? JSON.stringify(payload) : null,
      createdAt: new Date(),
    });
    return this.requestLogRepository.save(requestLog);
  }

  private async updateRequestLog(logId: number, data: RequestLogUpdate): Promise<void> {
    await this.requestLogRepository.update(logId, {
      response: data.error ? undefined : JSON.stringify(data),
      // error: data.error,
      updatedAt: new Date(),
    });
  }

  private async saveChargeMetadata(chargeId: number, name: string, value: string): Promise<void> {
    const metadata = this.chargeMetadataRepository.create({ chargeId, name, value });
    await this.chargeMetadataRepository.save(metadata);
  }

  private async markChargeAsSuccessful(charge: ChargeEntity): Promise<any> {
    return await this.settleCharge.add('settle', { charge_id: charge.id, settle: true });
  }

  private verifyKlumpSignature(payload: any, signature: string): boolean {
    const crypto = require('crypto');
    const secretKey = process.env.KLUMP_SECRET_KEY;

    if (!secretKey) return false;

    const computedHash = crypto
      .createHmac('sha512', secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    return computedHash === signature;
  }
}
