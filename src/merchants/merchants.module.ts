import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { MerchantsService } from './merchants.service';
import { MerchantEntity } from '../database/entities/merchant.entity';
import { IntegrationEntity } from '../database/entities/integration.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MerchantEntity, IntegrationEntity]),
    HttpModule,
  ],
  providers: [MerchantsService],
  exports: [MerchantsService],
})
export class MerchantsModule {}