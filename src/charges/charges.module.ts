import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ChargesController } from './charges.controller';
import { ChargesService } from './charges.service';
import { ChargeEntity } from '../database/entities/charge.entity';
import { ChargeInfoEntity } from '../database/entities/charge-info.entity';
import { ChargeHistoryEntity } from '../database/entities/charge-history.entity';
import { ChargeMetadataEntity } from '../database/entities/charge-metadata.entity';
import { MerchantEntity } from '../database/entities/merchant.entity';
import { IntegrationEntity } from '../database/entities/integration.entity';
import { ProvidersModule } from '../providers/providers.module';
import { AuthModule } from '../auth/auth.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChargeEntity,
      ChargeInfoEntity,
      ChargeHistoryEntity,
      ChargeMetadataEntity,
      MerchantEntity,
      IntegrationEntity,
    ]),
    BullModule.registerQueue({ name: 'settle-charge' }),
    HttpModule,
    ProvidersModule,
    AuthModule,
  ],
  controllers: [ChargesController],
  providers: [ChargesService],
  exports: [ChargesService],
})
export class ChargesModule {}
