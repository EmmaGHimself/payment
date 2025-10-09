import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChargeEntity } from '../database/entities/charge.entity';
import { ChargeHistoryEntity } from '../database/entities/charge-history.entity';
import { ChargeMetadataEntity } from '../database/entities/charge-metadata.entity';
import { RequestLogEntity } from '../database/entities/request-log.entity';
import { PaystackWebhookHandler } from './handlers/paystack-webhook.handler';
import { TransferWebhookHandler } from './handlers/transfer-webhook.handler';
import { PaystackWebhookDto } from './dto/paystack-webhook.dto';
import { TransferWebhookDto } from './dto/transfer-webhook.dto';
import { CHARGE_STATUS } from '../common/constants/status.constants';
import { WEBHOOK_EVENT_TYPES } from '../common/constants/status.constants';
import { KnipWebhookHandler } from './handlers/knip-webhook.handler';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

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
    // @InjectQueue('') private readonly settleCharge: Queue,
    private readonly paystackWebhookHandler: PaystackWebhookHandler,
    private readonly knipWebhookHandler: KnipWebhookHandler,
    private readonly transferWebhookHandler: TransferWebhookHandler,
  ) {}

  async handlePaystackWebhook(
    payload: PaystackWebhookDto,
    signature: string,
    rawBody: Buffer,
  ) {
    // Log incoming webhook
    const requestLog = await this.logIncomingRequest(
      'paystack',
      'webhook',
      payload,
    );

    try {
      const result = await this.paystackWebhookHandler.handle(
        payload,
        signature,
        rawBody,
      );

      // Update request log with response
      await this.updateRequestLog(requestLog.id, result);

      return { status: 'OK' };
    } catch (error) {
      await this.updateRequestLog(requestLog.id, { error: error.message });
      throw error;
    }
  }

  async handleKnipWebhook(payload: any, body: any) {
    const requestLog = await this.logIncomingRequest('knip', 'webhook', payload);
    try {
      const result = await this.knipWebhookHandler.handle(payload, body);
      await this.updateRequestLog(requestLog.id, result);
      return { status: 'OK' };
    } catch (err) {
      await this.updateRequestLog(requestLog.id, { error: err.message });
      throw err;
    }
  }

  async handleTransferWebhook(payload: TransferWebhookDto) {
    // Log incoming webhook
    const requestLog = await this.logIncomingRequest('transfer', 'webhook', payload);

    try {
      const result = await this.transferWebhookHandler.handle(payload);

      // Update request log with response
      await this.updateRequestLog(requestLog.id, result);

      return { status: 'OK' };
    } catch (error) {
      await this.updateRequestLog(requestLog.id, { error: error.message });
      throw error;
    }
  }

  async handleKlumpWebhook(payload: any, signature: string, webhookId: string, attempt: string) {
    // Log incoming webhook
    const requestLog = await this.logIncomingRequest('klump', 'webhook', payload);

    try {
      // Find charge by merchant reference
      const charge = await this.chargeRepository.findOne({
        where: { identifier: payload.data?.merchant_reference },
      });

      if (!charge) {
        this.logger.warn(`Charge not found for Klump webhook: ${payload.data?.merchant_reference}`);
        return { status: 'OK' };
      }

      // Verify signature
      if (!this.verifyKlumpSignature(payload, signature)) {
        this.logger.warn('Invalid Klump webhook signature');
        return { status: 'OK' };
      }

      const isSuccessful =
        payload.event?.includes('successful') && payload.data?.status === 'successful';

      if (isSuccessful) {
        // Check if already processed
        const existingMetadata = await this.chargeMetadataRepository.findOne({
          where: { chargeId: charge.id, name: 'klump_webhook_id' },
        });

        if (existingMetadata && existingMetadata.value) {
          // Update attempt count
          await this.saveChargeMetadata(charge.id, 'klump_attempts', attempt);
          return { status: 'OK' };
        }

        // Save metadata and mark as successful
        await Promise.all([
          this.saveChargeMetadata(charge.id, 'klump_webhook_id', webhookId),
          this.saveChargeMetadata(charge.id, 'klump_reference', payload.data.reference),
          this.saveChargeMetadata(charge.id, 'klump_attempts', attempt),
          this.markChargeAsSuccessful(charge),
        ]);
      }

      // Update request log
      await this.updateRequestLog(requestLog.id, {
        charge_id: charge.id,
        processed: true,
      });

      return { status: 'OK' };
    } catch (error) {
      this.logger.error('Error processing Klump webhook:', error);
      await this.updateRequestLog(requestLog.id, { error: error.message });
      return { status: 'OK' }; // Always return OK for Klump
    }
  }

  private async logIncomingRequest(
    service: string,
    endpoint: string,
    payload: any,
  ): Promise<RequestLogEntity> {
    const requestLog = this.requestLogRepository.create({
      service,
      endpoint,
      request: JSON.stringify(payload),
      createdAt: new Date(),
    });

    return this.requestLogRepository.save(requestLog);
  }

  private async updateRequestLog(logId: number, response: any): Promise<void> {
    await this.requestLogRepository.update(logId, {
      response: JSON.stringify(response),
      updatedAt: new Date(),
    });
  }

  private async saveChargeMetadata(chargeId: number, name: string, value: string): Promise<void> {
    const metadata = this.chargeMetadataRepository.create({
      chargeId,
      name,
      value,
    });

    await this.chargeMetadataRepository.save(metadata);
  }

  private async markChargeAsSuccessful(charge: ChargeEntity): Promise<void> {
    // Update charge status
    await this.chargeRepository.update(charge.id, {
      status: CHARGE_STATUS.SUCCESSFUL,
      successful: true,
    });

    // Log charge history
    const history = this.chargeHistoryRepository.create({
      chargeId: charge.id,
      description: 'Payment successful via webhook',
      responseMessage: 'Payment completed',
      status: CHARGE_STATUS.SUCCESSFUL,
      activity: 'WEBHOOK_SUCCESS',
    });

    await this.chargeHistoryRepository.save(history);
  }

  private verifyKlumpSignature(payload: any, signature: string): boolean {
    // Implementation depends on Klump's signature verification method
    // This is a placeholder implementation
    const crypto = require('crypto');
    const secretKey = process.env.KLUMP_SECRET_KEY;

    if (!secretKey) {
      return false;
    }

    const computedHash = crypto
      .createHmac('sha512', secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    return computedHash === signature;
  }
}
