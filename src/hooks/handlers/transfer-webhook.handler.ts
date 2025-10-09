import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChargeEntity } from '../../database/entities/charge.entity';
import { ChargeHistoryEntity } from '../../database/entities/charge-history.entity';
import { TransferWebhookDto } from '../dto/transfer-webhook.dto';
import { CHARGE_STATUS } from '../../common/constants/status.constants';
import { PaymentException } from '../../common/exceptions/payment.exception';
import { ERROR_CODES } from '../../common/constants/error.constants';

@Injectable()
export class TransferWebhookHandler {
  private readonly logger = new Logger(TransferWebhookHandler.name);

  constructor(
    @InjectRepository(ChargeEntity)
    private readonly chargeRepository: Repository<ChargeEntity>,
    @InjectRepository(ChargeHistoryEntity)
    private readonly chargeHistoryRepository: Repository<ChargeHistoryEntity>,
  ) {}

  async handle(payload: TransferWebhookDto) {
    // Find charge by identifier
    const charge = await this.chargeRepository.findOne({
      where: { identifier: payload.identifier },
    });

    if (!charge) {
      throw new PaymentException(
        'Charge not found',
        404,
        ERROR_CODES.TRANSACTION_NOT_FOUND,
      );
    }

    const isSuccessful = payload.status === 'success';

    // Skip if already processed successfully
    if (charge.status === CHARGE_STATUS.SUCCESSFUL && charge.successful) {
      return {
        message: 'Charge already processed',
        charge_id: charge.id,
      };
    }

    // Update charge status
    const newStatus = isSuccessful ? CHARGE_STATUS.SUCCESSFUL : CHARGE_STATUS.FAILED;
    
    await this.chargeRepository.update(charge.id, {
      status: newStatus,
      successful: isSuccessful,
    });

    // Log charge history
    await this.logChargeHistory(charge.id, {
      description: 'Transfer webhook received',
      responseMessage: payload.status,
      status: newStatus,
      activity: 'TRANSFER_WEBHOOK',
      response: payload,
    });

    return {
      message: 'Transfer webhook processed',
      charge_id: charge.id,
      status: newStatus,
    };
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