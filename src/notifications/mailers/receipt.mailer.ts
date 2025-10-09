import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { ChargeEntity } from '../../database/entities/charge.entity';

@Injectable()
export class ReceiptMailer {
  private readonly logger = new Logger(ReceiptMailer.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  async receiptMailer(charge: ChargeEntity): Promise<void> {
    try {
      if (!charge.email || !charge.successful) {
        return;
      }

      await this.notificationsService.sendPaymentReceiptEmail({
        email: charge.email,
        amount: charge.amount,
        reference: charge.identifier,
        merchantName: charge.merchantName,
        status: charge.status,
      });

      this.logger.log(`Receipt email sent for charge: ${charge.identifier}`);
    } catch (error) {
      this.logger.error(`Failed to send receipt email for charge ${charge.identifier}:`, error);
    }
  }
}