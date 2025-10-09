import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health/health.controller';
import { MetricsService } from './metrics/metrics.service';
import { LoggingService } from './logging/logging.service';
import { ChargeEntity } from '../database/entities/charge.entity';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    TypeOrmModule.forFeature([ChargeEntity]),
  ],
  controllers: [HealthController],
  providers: [MetricsService, LoggingService],
  exports: [MetricsService, LoggingService],
})
export class MonitoringModule {}