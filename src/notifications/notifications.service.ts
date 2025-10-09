import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { NotificationDto } from './dto/notification.dto';

export interface EmailNotification {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
  priority?: number;
}

export interface SmsNotification {
  to: string;
  message: string;
  priority?: number;
}

export interface SettlementNotificationData {
  chargeId: number;
  settlementId: number;
  amount: number;
  netAmount: number;
  merchantId: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue('email-notifications') private emailQueue: Queue,
    @InjectQueue('sms-notifications') private smsQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async sendEmail(notification: EmailNotification): Promise<void> {
    try {
      await this.emailQueue.add('send-email', notification, {
        priority: notification.priority || 5,
        attempts: 3
      });

      this.logger.log(`Email notification queued: ${notification.subject} to ${notification.to}`);
    } catch (error) {
      this.logger.error(`Failed to queue email notification:`, error);
      throw error;
    }
  }

  async sendSms(notification: SmsNotification): Promise<void> {
    try {
      await this.smsQueue.add('send-sms', notification, {
        priority: notification.priority || 5,
        attempts: 3
      });

      this.logger.log(`SMS notification queued to ${notification.to}`);
    } catch (error) {
      this.logger.error(`Failed to queue SMS notification:`, error);
      throw error;
    }
  }

  async sendPaymentReceiptEmail(data: {
    email: string;
    amount: number;
    reference: string;
    merchantName: string;
    status: string;
  }): Promise<void> {
    await this.sendEmail({
      to: data.email,
      subject: `Payment Receipt - ${data.reference}`,
      template: 'payment-receipt',
      data,
      priority: 8,
    });
  }

  async sendTransferInstructionsEmail(data: {
    email: string;
    customerName: string;
    amount: number;
    accountNumber: string;
    accountName: string;
    bankName: string;
    reference: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.sendEmail({
      to: data.email,
      subject: `Transfer Instructions - ${data.reference}`,
      template: 'transfer-instructions',
      data,
      priority: 9,
    });
  }

  async sendOtpSms(phone: string, otp: string, reference: string): Promise<void> {
    const message = `Your KongaPay OTP is: ${otp}. Reference: ${reference}. Valid for 10 minutes.`;
    
    await this.sendSms({
      to: phone,
      message,
      priority: 10, // High priority for OTPs
    });
  }

  async sendSettlementNotification(data: SettlementNotificationData): Promise<void> {
    // This would typically send to merchant's webhook URL or email
    this.logger.log(`Settlement notification: ${data.settlementId} for charge ${data.chargeId}`);
    
    // Implementation would depend on merchant notification preferences
    // Could send webhook, email, or SMS based on merchant settings
  }

  async sendFailureAlert(data: {
    type: 'payment' | 'settlement' | 'webhook';
    reference: string;
    error: string;
    merchantId?: string;
  }): Promise<void> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    
    if (adminEmail) {
      await this.sendEmail({
        to: adminEmail,
        subject: `KongaPay Alert: ${data.type} failure`,
        template: 'failure-alert',
        data,
        priority: 10,
      });
    }
  }

  async sendBulkNotifications(notifications: NotificationDto[]): Promise<void> {
    const emailNotifications = notifications.filter(n => n.type === 'email');
    const smsNotifications = notifications.filter(n => n.type === 'sms');

    // Batch process email notifications
    for (const notification of emailNotifications) {
      await this.sendEmail({
        to: notification.recipient,
        subject: notification.subject || 'KongaPay Notification',
        template: notification.template || 'generic',
        data: notification.data || {},
      });
    }

    // Batch process SMS notifications
    for (const notification of smsNotifications) {
      await this.sendSms({
        to: notification.recipient,
        message: notification.message || '',
      });
    }

    this.logger.log(`Bulk notifications sent: ${notifications.length} total`);
  }
}