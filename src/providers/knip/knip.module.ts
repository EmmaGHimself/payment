import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CircuitBreakerService } from '../base/circuit-breaker.service';
import { KnipService } from './knip.service';
import { KnipClient } from './knip.client';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [CircuitBreakerService, KnipService, KnipClient],
  exports: [KnipService, KnipClient],
})
export class KnipModule {}
