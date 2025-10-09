import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { SettlementService } from './settlement.service';
import { SettlementObserver } from './observers/settlement.observer';
import { ChargeEntity } from '../database/entities/charge.entity';
import { SettlementEntity } from '../database/entities/settlement.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChargeEntity, SettlementEntity]),
    BullModule.registerQueue({
      name: 'settlement',
    }),
    HttpModule,
    NotificationsModule,
  ],
  providers: [SettlementService, SettlementObserver],
  exports: [SettlementService, SettlementObserver],
})
export class SettlementModule {}