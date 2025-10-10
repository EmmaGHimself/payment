import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ChargeEntity } from '../database/entities/charge.entity';
import { ChargeInfoEntity } from '../database/entities/charge-info.entity';
import { ChargeHistoryEntity } from '../database/entities/charge-history.entity';
import { ChargeMetadataEntity } from '../database/entities/charge-metadata.entity';
import { ProvidersModule } from '../providers/providers.module';
import { AuthModule } from '../auth/auth.module';
import { CardPaymentStrategy } from './strategies/card-payment.strategy';
import { TransferPaymentStrategy } from './strategies/transfer-payment.strategy';
import { BullModule, BullQueueEvents } from '@nestjs/bull';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChargeEntity,
      ChargeInfoEntity,
      ChargeHistoryEntity,
      ChargeMetadataEntity,
    ]),
    BullModule.registerQueue({ name: 'settle-charge' }),
    HttpModule,
    ProvidersModule,
    AuthModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, CardPaymentStrategy, TransferPaymentStrategy],
  exports: [PaymentsService],
})
export class PaymentsModule {}
