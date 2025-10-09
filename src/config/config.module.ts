import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import databaseConfig from './database.config';
import paymentConfig from './payment.config';
import redisConfig from './redis.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      load: [databaseConfig, paymentConfig, redisConfig],
      isGlobal: true,
    }),
  ],
})
export class ConfigModule {}