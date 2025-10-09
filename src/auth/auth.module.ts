import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MerchantStrategy } from './strategies/merchant.strategy';
import { IntegrationEntity } from '../database/entities/integration.entity';
import { MerchantEntity } from '../database/entities/merchant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([IntegrationEntity, MerchantEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'kongapay-secret-key'),
        signOptions: { expiresIn: '2h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MerchantStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}