import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentRequestsController } from './payment-requests.controller';
import { PaymentRequestsService } from './payment-requests.service';
import { PaymentRequestEntity } from '../database/entities/payment-request.entity';
import { IntegrationEntity } from '../database/entities/integration.entity';
import { ChargeInfoEntity } from '../database/entities/charge-info.entity';
import { AuthModule } from '../auth/auth.module';
import { ChargesModule } from '../charges/charges.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentRequestEntity,
      IntegrationEntity,
      ChargeInfoEntity,
    ]),
    AuthModule,
    ChargesModule,
  ],
  controllers: [PaymentRequestsController],
  providers: [PaymentRequestsService],
  exports: [PaymentRequestsService],
})
export class PaymentRequestsModule {}
