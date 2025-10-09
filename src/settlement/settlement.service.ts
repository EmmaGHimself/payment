import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { ChargeEntity } from '../database/entities/charge.entity';
import { SettlementEntity } from '../database/entities/settlement.entity';
import { HashUtil } from '../common/utils/hash.util';

export interface SettlementRequest {
  chargeId: number;
  amount: number;
  fee?: number;
  settlementAccount?: string;
  manualSettlement?: boolean;
  reason?: string;
  extraData?: Record<string, any>;
}

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    @InjectRepository(ChargeEntity)
    private readonly chargeRepository: Repository<ChargeEntity>,
    @InjectRepository(SettlementEntity)
    private readonly settlementRepository: Repository<SettlementEntity>,
    @InjectQueue('settlement') private settlementQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async processSettlement(request: SettlementRequest): Promise<SettlementEntity> {
    const { chargeId, amount, fee = 0, extraData = {} } = request;

    // Check if already settled
    const existingSettlement = await this.settlementRepository.findOne({
      where: { chargeId },
    });

    if (existingSettlement) {
      this.logger.warn(`Settlement already exists for charge ${chargeId}`);
      return existingSettlement;
    }

    // Get charge details
    const charge = await this.chargeRepository.findOne({
      where: { id: chargeId },
      relations: ['chargeInfo'],
    });

    if (!charge) {
      throw new Error(`Charge not found: ${chargeId}`);
    }

    // Calculate settlement amounts
    const calculatedFee = fee || this.calculateFee(amount);
    const netAmount = amount - calculatedFee;

    // Create settlement record
    const settlement = this.settlementRepository.create({
      chargeId,
      amount,
      fee: calculatedFee,
      netAmount,
      currency: charge.currency || 'NGN',
      status: 'pending',
      settlementReference: HashUtil.generateReference(),
      settlementAccount: request.settlementAccount || charge.chargeInfo?.settlementAccount,
      manualSettlement: request.manualSettlement || false,
      reason: request.reason,
      settlementData: {
        ...extraData,
        merchantId: charge.merchantId,
        chargeIdentifier: charge.identifier,
        processedAt: new Date(),
      },
    });

    const savedSettlement = await this.settlementRepository.save(settlement);

    // Queue for async processing if not manual
    if (!request.manualSettlement) {
      await this.settlementQueue.add('process-settlement', {
        settlementId: savedSettlement.id,
        chargeId,
      }, {
        delay: 5000, // 5 second delay
        attempts: 3
      });
    } else {
      // Mark as completed for manual settlements
      await this.markSettlementCompleted(savedSettlement.id);
    }

    this.logger.log(`Settlement created: ${savedSettlement.settlementReference} for charge ${chargeId}`);

    return savedSettlement;
  }

  async markSettlementCompleted(settlementId: number): Promise<void> {
    await this.settlementRepository.update(settlementId, {
      status: 'completed',
      settlementDate: new Date(),
    });

    // Mark charge as settled
    const settlement = await this.settlementRepository.findOne({
      where: { id: settlementId },
    });

    if (settlement) {
      await this.chargeRepository.update(settlement.chargeId, {
        settled: true,
      });
    }

    this.logger.log(`Settlement completed: ${settlementId}`);
  }

  async markSettlementFailed(settlementId: number, reason: string): Promise<void> {
    await this.settlementRepository.update(settlementId, {
      status: 'failed',
      reason,
    });

    this.logger.error(`Settlement failed: ${settlementId} - ${reason}`);
  }

  async getSettlementsByDateRange(startDate: Date, endDate: Date): Promise<SettlementEntity[]> {
    return this.settlementRepository.find({
      where: {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        } as any,
      },
      relations: ['charge'],
      order: { createdAt: 'DESC' },
    });
  }

  async getSettlementStats(merchantId?: string): Promise<{
    totalSettlements: number;
    totalAmount: number;
    totalFees: number;
    totalNetAmount: number;
    pendingSettlements: number;
    completedSettlements: number;
  }> {
    const queryBuilder = this.settlementRepository.createQueryBuilder('settlement')
      .leftJoin('settlement.charge', 'charge');

    if (merchantId) {
      queryBuilder.where('charge.merchantId = :merchantId', { merchantId });
    }

    const [totalResult, statusResults] = await Promise.all([
      queryBuilder
        .select([
          'COUNT(*) as totalSettlements',
          'SUM(settlement.amount) as totalAmount',
          'SUM(settlement.fee) as totalFees',
          'SUM(settlement.netAmount) as totalNetAmount',
        ])
        .getRawOne(),
      queryBuilder
        .clone()
        .select(['settlement.status', 'COUNT(*) as count'])
        .groupBy('settlement.status')
        .getRawMany(),
    ]);

    const statusCounts = statusResults.reduce((acc, result) => {
      acc[result.status] = parseInt(result.count);
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSettlements: parseInt(totalResult.totalSettlements || '0'),
      totalAmount: parseFloat(totalResult.totalAmount || '0'),
      totalFees: parseFloat(totalResult.totalFees || '0'),
      totalNetAmount: parseFloat(totalResult.totalNetAmount || '0'),
      pendingSettlements: statusCounts.pending || 0,
      completedSettlements: statusCounts.completed || 0,
    };
  }

  private calculateFee(amount: number): number {
    const feePercentage = this.configService.get<number>('payment.fees.percentage', 1.5);
    const feeCap = this.configService.get<number>('payment.fees.cap', 2000);
    
    let fee = amount * (feePercentage / 100);
    if (feeCap && fee > feeCap) {
      fee = feeCap;
    }
    
    return Math.round(fee * 100) / 100; // Round to 2 decimal places
  }
}
