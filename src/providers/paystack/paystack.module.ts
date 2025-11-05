import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PaystackService } from './paystack.service';
import { PaystackClient } from './paystack.client';
import { CircuitBreakerService } from '../base/circuit-breaker.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChargeMetadataEntity } from '@/database/entities/charge-metadata.entity';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypeOrmModule.forFeature([ChargeMetadataEntity])
  ],
  providers: [
    PaystackService,
    PaystackClient,
    CircuitBreakerService,
  ],
  exports: [PaystackService, PaystackClient],
})
export class PaystackModule {}