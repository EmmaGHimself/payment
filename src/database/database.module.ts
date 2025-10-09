import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChargeEntity } from './entities/charge.entity';
import { ChargeInfoEntity } from './entities/charge-info.entity';
import { ChargeHistoryEntity } from './entities/charge-history.entity';
import { ChargeMetadataEntity } from './entities/charge-metadata.entity';
import { PaymentRequestEntity } from './entities/payment-request.entity';
import { MerchantEntity } from './entities/merchant.entity';
import { IntegrationEntity } from './entities/integration.entity';
import { ServiceLogEntity } from './entities/service-log.entity';
import { RequestLogEntity } from './entities/request-log.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
        entities: [
          ChargeEntity,
          ChargeInfoEntity,
          ChargeHistoryEntity,
          ChargeMetadataEntity,
          PaymentRequestEntity,
          MerchantEntity,
          IntegrationEntity,
          ServiceLogEntity,
          RequestLogEntity,
        ],
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      ChargeEntity,
      ChargeInfoEntity,
      ChargeHistoryEntity,
      ChargeMetadataEntity,
      PaymentRequestEntity,
      MerchantEntity,
      IntegrationEntity,
      ServiceLogEntity,
      RequestLogEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}