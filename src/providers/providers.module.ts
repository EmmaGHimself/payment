import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PaystackModule } from './paystack/paystack.module';
import { CircuitBreakerService } from './base/circuit-breaker.service';
import { PaymentProviderFactory } from './factory/payment-provider.factory';
import { ProviderRegistryService } from './factory/provider-registry.service';
import { KnipModule } from './knip/knip.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
    PaystackModule,
    KnipModule
  ],
  providers: [
    CircuitBreakerService,
    PaymentProviderFactory,
    ProviderRegistryService,
  ],
  exports: [
    CircuitBreakerService,
    PaymentProviderFactory,
    ProviderRegistryService,
    PaystackModule,
  ],
})
export class ProvidersModule {}