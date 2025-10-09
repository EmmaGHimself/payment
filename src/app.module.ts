import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisModule } from '@nestjs-modules/ioredis';
import { redisStore } from 'cache-manager-redis-store';
import { ConfigService } from '@nestjs/config';

import { ConfigModule } from './config/config.module'; // 👈 your custom config
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ChargesModule } from './charges/charges.module';
import { HooksModule } from './hooks/hooks.module';
import { PaymentRequestsModule } from './payment-requests/payment-requests.module';
import { PaymentsModule } from './payments/payments.module';
import { ProvidersModule } from './providers/providers.module';
import { MerchantsModule } from './merchants/merchants.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettlementModule } from './settlement/settlement.module';
import { MonitoringModule } from './monitoring/monitoring.module';

import { AuthMiddleware } from './common/middleware/auth.middleware';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';

@Module({
  imports: [
    ConfigModule, // 👈 replaces NestConfigModule.forRoot() here

    // IORedis
    RedisModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        type: 'single',
        options: {
          host: config.get('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get('redis.password'),
          db: config.get<number>('redis.db'),
        },
      }),
      inject: [ConfigService],
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: redisStore as any,
        host: config.get('redis.host'),
        port: config.get<number>('redis.port'),
        ttl: 300,
      }),
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('redis.host'),
          port: config.get<number>('redis.port'),
        },
      }),
    }),

    DatabaseModule, // your DB connection module
    AuthModule,
    ChargesModule,
    HooksModule,
    PaymentRequestsModule,
    PaymentsModule,
    ProvidersModule,
    MerchantsModule,
    IntegrationsModule,
    NotificationsModule,
    SettlementModule,
    MonitoringModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RateLimitMiddleware, AuthMiddleware).forRoutes('*');
  }
}
