import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import { BasePaymentProvider } from '../base/base-payment-provider';
import { CircuitBreakerService } from '../base/circuit-breaker.service';
import {
  PaymentRequest,
  PaymentResponse,
} from '../../common/interfaces/payment-provider.interface';
import { PAYMENT_PROVIDERS } from '../../common/constants/payment.constants';
import { MaskUtil } from '../../common/utils/mask.util';

@Injectable()
export class PaystackService extends BasePaymentProvider {
  constructor(
    httpService: HttpService,
    configService: ConfigService,
    circuitBreakerService: CircuitBreakerService,
  ) {
    super(httpService, configService, circuitBreakerService, PAYMENT_PROVIDERS.PAYSTACK);
  }

  getName() {
    return PAYMENT_PROVIDERS.PAYSTACK;
  }

  async createCharge(request: PaymentRequest): Promise<any> {
    try {
      const payload = {
        email: request.email,
        amount: request.amount * 100, // Paystack expects amount in kobo
        reference: request.reference,
        currency: request.currency,
        card: request.card,
        metadata: {
          ...request.metadata,
          custom_fields: [
            {
              display_name: 'Merchant reference',
              variable_name: 'merchant_reference',
              value: request.reference,
            },
          ],
        },
      };

      const response = await this.makeRequest('POST', '/charge', payload);
      const nextAction = this.getNextAction(response.data.status as string);
      if (nextAction.includes('completed')) {
        return {
          ...response.data,
          status: 'success',
          message: response.data.display_text || response.data.message,
          action_required: nextAction,
        };
      }
      throw new InternalServerErrorException({
        message: response.data.display_text || response.data.message,
        data: response.data,
        action_required: nextAction,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async verifyTransaction(reference: string): Promise<PaymentResponse> {
    try {
      const response = await this.makeRequest('GET', `/transaction/verify/${reference}`);

      if (response.data.status && response.data.data.status === 'success') {
        return {
          success: true,
          reference,
          message: response.data.message,
          data: response.data.data,
        };
      }

      return {
        success: false,
        reference,
        message: response.data.message || 'Transaction verification failed',
        data: response.data.data,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async submitValidation(
    reference: string,
    validationData: Record<string, any>,
  ): Promise<PaymentResponse> {
    try {
      const { type, ...data } = validationData;
      let endpoint = '';

      switch (type) {
        case 'otp':
          endpoint = '/charge/submit_otp';
          break;
        case 'pin':
          endpoint = '/charge/submit_pin';
          break;
        case 'phone':
          endpoint = '/charge/submit_phone';
          break;
        case 'birthday':
          endpoint = '/charge/submit_birthday';
          break;
        case 'address':
          endpoint = '/charge/submit_address';
          break;
        default:
          throw new Error(`Unsupported validation type: ${type}`);
      }

      const payload = {
        reference,
        ...data,
      };

      const response = await this.makeRequest('POST', endpoint, payload);

      return {
        success: response.data.status,
        reference,
        message: response.data.message,
        data: response.data.data,
        action_required: this.getNextAction(response.data?.status),
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Validation submission failed');
      // return this.handleError(error);
    }
  }

  async processWebhook(payload: Record<string, any>, signature: string): Promise<PaymentResponse> {
    try {
      if (!this.verifyWebhookSignature(payload, signature)) {
        throw new Error('Invalid webhook signature');
      }

      const { event, data } = payload;
      const reference = data.reference;

      let success = false;
      let message = 'Webhook processed';

      switch (event) {
        case 'charge.success':
          success = data.status === 'success';
          message = success ? 'Payment successful' : 'Payment failed';
          break;
        case 'transfer.success':
        case 'transfer.failed':
          success = event === 'transfer.success';
          message = success ? 'Transfer successful' : 'Transfer failed';
          break;
      }

      return {
        success,
        reference,
        message,
        data,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  protected getDefaultHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.credentials.secretKey}`,
    };
  }

  private verifyWebhookSignature(payload: any, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.config.credentials.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }

  private getNextAction(status: string): string | undefined {
    const actionMap: Record<string, string> = {
      pending: 'paystack_requery',
      timeout: 'terminate',
      send_pin: 'paystack_enter_pin',
      send_phone: 'paystack_enter_phone',
      send_birthday: 'paystack_enter_birthday',
      send_address: 'paystack_enter_address',
      send_otp: 'paystack_enter_otp',
      open_url: 'paystack_open_url',
      pay_offline: 'paystack_pay_offline',
      failed: 'terminate',
      success: 'paystack_completed',
    };

    return actionMap[status];
  }
}
