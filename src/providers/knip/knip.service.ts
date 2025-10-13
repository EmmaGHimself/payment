import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import { BasePaymentProvider } from '../base/base-payment-provider';
import { CircuitBreakerService } from '../base/circuit-breaker.service';
import { PaymentRequest, PaymentResponse } from '../../common/interfaces/payment-provider.interface';
import { PAYMENT_PROVIDERS } from '../../common/constants/payment.constants';
import { MaskUtil } from '../../common/utils/mask.util';

@Injectable()
export class KnipService extends BasePaymentProvider {
  constructor(httpService: HttpService, configService: ConfigService, circuitBreakerService: CircuitBreakerService) {
    super(httpService, configService, circuitBreakerService, PAYMENT_PROVIDERS.KNIP);
  }

  getName() {
    return PAYMENT_PROVIDERS.KNIP;
  }

  async createCharge(request: PaymentRequest): Promise<any> {
    try {
      const payload = {
        account_name: request.merchant_name,
        amount: `${request.amount}`,
        expiers_in: 1,
        reference: request.reference,
        callback_url: `${this.configService.get<string>('payment.providers.knip.callback_url')}`,
        // settlement_account: this.configService.getOrThrow<string>('payment.providers.knip.settlement_account'),
      };
      console.log('payload for KNIP VA ===> ', payload);
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

      const data = response.data;

      return {
        bankName: data.data.Bank,
        accountNumber: data.data.account_number,
        accountName: data.data.account_name,
        amount: String(request.amount),
        reference: data.data.reference,
        paymentReference: request.reference,
        transactionReference: request.reference,
        totalPayable: String(request.amount),
        fee: 0,
      };
    } catch (err) {}
  }

  async verifyTransaction(reference: string): Promise<any> {}

  async submitValidation(reference: string, validationData: Record<string, any>): Promise<any> {}

  async processWebhook(payload: Record<string, any>, signature: string): Promise<any> {
    try {
    } catch (error) {
      return this.handleError(error);
    }
  }

  protected getDefaultHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.credentials.secretKey}`,
    };
  }

  private verifyWebhookSignature(payload: any, signature: string) {}

  // private getNextAction(status: string): any {}
}
