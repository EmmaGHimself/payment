import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { HooksController } from './hooks.controller';
import { HooksService } from './hooks.service';
import { ChargeEntity } from '../database/entities/charge.entity';
import { ChargeHistoryEntity } from '../database/entities/charge-history.entity';
import { ChargeMetadataEntity } from '../database/entities/charge-metadata.entity';
import { RequestLogEntity } from '../database/entities/request-log.entity';
import { PaystackWebhookHandler } from './handlers/paystack-webhook.handler';
import { TransferWebhookHandler } from './handlers/transfer-webhook.handler';
import { ProvidersModule } from '../providers/providers.module';
import { KnipWebhookHandler } from './handlers/knip-webhook.handler';
import { ChargeInfoEntity } from 'src/database/entities/charge-info.entity';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChargeEntity,
      ChargeHistoryEntity,
      ChargeMetadataEntity,
      RequestLogEntity,
      ChargeInfoEntity
    ]),
    // BullModule.registerQueue(),
    HttpModule,
    ProvidersModule,
  ],
  controllers: [HooksController],
  providers: [
    HooksService,
    PaystackWebhookHandler,
    TransferWebhookHandler,
    KnipWebhookHandler
  ],
  exports: [HooksService],
})
export class HooksModule {}