import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisModule } from '@nestjs-modules/ioredis';
import { redisStore } from 'cache-manager-redis-store';
import { ConfigService } from '@nestjs/config';

import { ConfigModule } from './config/config.module';
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
    ConfigModule, // must come first so ConfigService is available everywhere

    // 🔹 Redis Client (for direct Redis operations)
    RedisModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    type: 'single',
    options: {
      host: config.get<string>('redis.host'),
      port: config.get<number>('redis.port'),
      username: config.get<string>('redis.username'),
      password: config.get<string>('redis.password'),
      db: config.get<number>('redis.db'),
      tls: config.get('redis.tls'), // 👈 now includes servername
    },
  }),
  inject: [ConfigService],
}),


    // 🔹 Cache Manager (uses Redis)
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: redisStore as any,
        socket: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          tls: config.get('redis.tls') || undefined,
        },
        username: config.get<string>('redis.username'),
        password: config.get<string>('redis.password'),
        ttl: config.get<number>('redis.ttl'),
      }),
    }),

    // 🔹 BullMQ (queues / background jobs)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        redis: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          username: config.get<string>('redis.username'),
          password: config.get<string>('redis.password'),
          tls: config.get('redis.tls') || undefined,
        },
      }),
    }),

    // 🔹 Business Modules
    DatabaseModule,
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
