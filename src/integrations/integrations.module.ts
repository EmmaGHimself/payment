import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { IntegrationEntity } from '../database/entities/integration.entity';
import { ChargeEntity } from '../database/entities/charge.entity';
import { ChargeInfoEntity } from '../database/entities/charge-info.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IntegrationEntity, ChargeEntity, ChargeInfoEntity]),
    HttpModule,
    AuthModule,
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}