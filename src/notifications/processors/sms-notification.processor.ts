import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SmsNotification } from '../notifications.service';

@Processor('sms-notifications')
@Injectable()
export class SmsNotificationProcessor {
  private readonly logger = new Logger(SmsNotificationProcessor.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @Process('send-sms')
  async handleSendSms(job: Job<SmsNotification>) {
    const { to, message } = job.data;

    try {
      // Example using a third-party SMS service (e.g., Twilio, African's Talking, etc.)
      const smsServiceUrl = this.configService.get<string>('SMS_SERVICE_URL');
      const smsServiceKey = this.configService.get<string>('SMS_SERVICE_API_KEY');
      const smsFrom = this.configService.get<string>('SMS_FROM_NUMBER', 'KongaPay');

      if (!smsServiceUrl || !smsServiceKey) {
        this.logger.warn('SMS service not configured, skipping SMS send');
        return;
      }

      const payload = {
        to: this.formatPhoneNumber(to),
        from: smsFrom,
        message,
      };

      const response = await firstValueFrom(
        this.httpService.post(`${smsServiceUrl}/send`, payload, {
          headers: {
            'Authorization': `Bearer ${smsServiceKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`SMS sent successfully to ${to}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}:`, error);
      throw error; // This will trigger Bull's retry mechanism
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Format Nigerian phone numbers
    let cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '234' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('234')) {
      // Already formatted
    } else if (cleanPhone.length === 10) {
      cleanPhone = '234' + cleanPhone;
    }
    
    return '+' + cleanPhone;
  }
}