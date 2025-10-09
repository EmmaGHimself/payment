import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { EmailNotification } from '../notifications.service';

@Processor('email-notifications')
@Injectable()
export class EmailNotificationProcessor {
  private readonly logger = new Logger(EmailNotificationProcessor.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @Process('send-email')
  async handleSendEmail(job: Job<EmailNotification>) {
    const { to, subject, template, data } = job.data;

    try {
      // Example using a third-party email service (e.g., SendGrid, Mailgun, etc.)
      const emailServiceUrl = this.configService.get<string>('EMAIL_SERVICE_URL');
      const emailServiceKey = this.configService.get<string>('EMAIL_SERVICE_API_KEY');

      if (!emailServiceUrl || !emailServiceKey) {
        this.logger.warn('Email service not configured, skipping email send');
        return;
      }

      const payload = {
        to,
        subject,
        template,
        data: {
          ...data,
          app_name: 'KongaPay',
          support_email: 'support@kongapay.com',
          current_year: new Date().getFullYear(),
        },
      };

      const response = await firstValueFrom(
        this.httpService.post(`${emailServiceUrl}/send`, payload, {
          headers: {
            'Authorization': `Bearer ${emailServiceKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`Email sent successfully to ${to}: ${subject}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error; // This will trigger Bull's retry mechanism
    }
  }
}