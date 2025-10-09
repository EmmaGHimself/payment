import { Injectable, Logger } from '@nestjs/common';
import { SettlementService } from '../settlement.service';
import { ChargeEntity } from '../../database/entities/charge.entity';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class SettlementObserver {
  private readonly logger = new Logger(SettlementObserver.name);

  constructor(
    private readonly settlementService: SettlementService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async settlementTxn(charge: ChargeEntity, extraData?: Record<string, any>) {
    try {
      // Only process settlement for successful charges
      if (!charge.successful || charge.settled) {
        return null;
      }

      const settlement = await this.settlementService.processSettlement({
        chargeId: charge.id,
        amount: charge.amount,
        extraData,
      });

      // Send settlement notification
      await this.notificationsService.sendSettlementNotification({
        chargeId: charge.id,
        settlementId: settlement.id,
        amount: settlement.amount,
        netAmount: settlement.netAmount,
        merchantId: charge.merchantId,
      });

      return settlement;
    } catch (error) {
      this.logger.error(`Settlement processing failed for charge ${charge.id}:`, error);
      throw error;
    }
  }

  async handleSettlementCompleted(settlementId: number) {
    await this.settlementService.markSettlementCompleted(settlementId);
  }

  async handleSettlementFailed(settlementId: number, reason: string) {
    await this.settlementService.markSettlementFailed(settlementId, reason);
  }
}