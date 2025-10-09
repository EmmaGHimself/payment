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
export class KnipService extends BasePaymentProvider {
  constructor(
    httpService: HttpService,
    configService: ConfigService,
    circuitBreakerService: CircuitBreakerService,
  ) {
    super(httpService, configService, circuitBreakerService, PAYMENT_PROVIDERS.KNIP);
  }

  getName() {
    return PAYMENT_PROVIDERS.KNIP;
  }

  async createCharge(request: PaymentRequest): Promise<any> {
    const payload = {
      account_name: request.merchant_name,
      amount: `${request.amount}`,
      expiers_in: 1,
      reference: request.reference,
      callback_url: `${this.configService.get<string>('payment.providers.knip.callback_url')}`,
      // settlement_account: this.configService.getOrThrow<string>('payment.providers.knip.settlement_account'),
    };
    const response = await this.makeRequest<{
      status: string;
      message: string;
      data: {
        account_number: string;
        account_name: string;
        reference: string;
        Bank: string;
        external_reference: string;
        status: string;
      };
    }>('POST', '/vir-account', payload);

    return {
      bankName: response.data.data.Bank,
      accountNumber: response.data.data.account_number,
      accountName: response.data.data.account_name,
      amount: String(request.amount),
      reference: response.data.data.reference,
      paymentReference: request.reference,
      transactionReference: request.reference,
      totalPayable: String(request.amount),
      fee: 0,
    };
  }

  async verifyTransaction(reference: string): Promise<any> {}

  async submitValidation(reference: string, validationData: Record<string, any>): Promise<any> {}

  async processWebhook(payload: Record<string, any>, signature: string): Promise<any> {
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

  private getNextAction(status: string): any {}
}
