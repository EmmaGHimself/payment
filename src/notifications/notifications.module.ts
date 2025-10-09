import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { NotificationsService } from './notifications.service';
import { ReceiptMailer } from './mailers/receipt.mailer';
import { TransferInstructionMailer } from './mailers/transfer-instruction.mailer';
import { EmailNotificationProcessor } from './processors/email-notification.processor';
import { SmsNotificationProcessor } from './processors/sms-notification.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email-notifications',
    }),
    BullModule.registerQueue({
      name: 'sms-notifications',
    }),
    HttpModule,
  ],
  providers: [
    NotificationsService,
    ReceiptMailer,
    TransferInstructionMailer,
    EmailNotificationProcessor,
    SmsNotificationProcessor,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
