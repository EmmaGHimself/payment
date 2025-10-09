import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ChargeEntity } from '../../database/entities/charge.entity';
import { CHARGE_STATUS } from '../../common/constants/status.constants';

export interface PaymentMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  totalVolume: number;
  averageTransactionAmount: number;
  transactionsByProvider: Record<string, number>;
  transactionsByStatus: Record<string, number>;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private metrics: PaymentMetrics = {
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    successRate: 0,
    totalVolume: 0,
    averageTransactionAmount: 0,
    transactionsByProvider: {},
    transactionsByStatus: {},
  };

  constructor(
    @InjectRepository(ChargeEntity)
    private readonly chargeRepository: Repository<ChargeEntity>,
  ) {}

  @Cron('*/5 * * * *') // Every 5 minutes
  async updateMetrics() {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get transaction counts and volumes
      const totalQuery = this.chargeRepository
        .createQueryBuilder('charge')
        .where('charge.createdAt >= :date', { date: last24Hours });

      const [total, successful, failed] = await Promise.all([
        totalQuery.getCount(),
        totalQuery.clone().andWhere('charge.successful = :successful', { successful: true }).getCount(),
        totalQuery.clone().andWhere('charge.status = :status', { status: CHARGE_STATUS.FAILED }).getCount(),
      ]);

      // Get volume metrics
      const volumeResult = await totalQuery
        .clone()
        .select('SUM(charge.amount)', 'totalVolume')
        .addSelect('AVG(charge.amount)', 'averageAmount')
        .getRawOne();

      // Get transactions by provider
      const providerStats = await totalQuery
        .clone()
        .select('charge.service', 'provider')
        .addSelect('COUNT(*)', 'count')
        .groupBy('charge.service')
        .getRawMany();

      // Get transactions by status
      const statusStats = await totalQuery
        .clone()
        .select('charge.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('charge.status')
        .getRawMany();

      this.metrics = {
        totalTransactions: total,
        successfulTransactions: successful,
        failedTransactions: failed,
        successRate: total > 0 ? (successful / total) * 100 : 0,
        totalVolume: parseFloat(volumeResult?.totalVolume || '0'),
        averageTransactionAmount: parseFloat(volumeResult?.averageAmount || '0'),
        transactionsByProvider: providerStats.reduce((acc, stat) => {
          acc[stat.provider || 'unknown'] = parseInt(stat.count);
          return acc;
        }, {}),
        transactionsByStatus: statusStats.reduce((acc, stat) => {
          acc[stat.status] = parseInt(stat.count);
          return acc;
        }, {}),
      };

      this.logger.log('Metrics updated successfully', { metrics: this.metrics });
    } catch (error) {
      this.logger.error('Failed to update metrics', error);
    }
  }

  getMetrics(): PaymentMetrics {
    return { ...this.metrics };
  }

  async getCustomMetrics(startDate: Date, endDate: Date): Promise<PaymentMetrics> {
    const query = this.chargeRepository
      .createQueryBuilder('charge')
      .where('charge.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });

    const [total, successful, failed] = await Promise.all([
      query.getCount(),
      query.clone().andWhere('charge.successful = :successful', { successful: true }).getCount(),
      query.clone().andWhere('charge.status = :status', { status: CHARGE_STATUS.FAILED }).getCount(),
    ]);

    const volumeResult = await query
      .clone()
      .select('SUM(charge.amount)', 'totalVolume')
      .addSelect('AVG(charge.amount)', 'averageAmount')
      .getRawOne();

    return {
      totalTransactions: total,
      successfulTransactions: successful,
      failedTransactions: failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      totalVolume: parseFloat(volumeResult?.totalVolume || '0'),
      averageTransactionAmount: parseFloat(volumeResult?.averageAmount || '0'),
      transactionsByProvider: {},
      transactionsByStatus: {},
    };
  }
}