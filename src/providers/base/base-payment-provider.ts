import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  IPaymentProvider,
  PaymentProviderConfig,
  PaymentRequest,
  PaymentResponse,
} from '../../common/interfaces/payment-provider.interface';
import { CircuitBreakerService } from './circuit-breaker.service';
import { PaymentProvider } from '../../common/constants/payment.constants';

@Injectable()
export abstract class BasePaymentProvider implements IPaymentProvider {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly config: PaymentProviderConfig;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
    protected readonly circuitBreakerService: CircuitBreakerService,
    providerName: PaymentProvider,
  ) {
    this.config = this.getProviderConfig(providerName);
  }

  abstract getName(): PaymentProvider;
  abstract createCharge(request: PaymentRequest): Promise<PaymentResponse>;
  abstract verifyTransaction(reference: string): Promise<PaymentResponse>;
  abstract submitValidation(reference: string, data: Record<string, any>): Promise<PaymentResponse>;
  abstract processWebhook(
    payload: Record<string, any>,
    signature: string,
  ): Promise<PaymentResponse>;

  protected async makeRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<AxiosResponse<T>> {
    const config: AxiosRequestConfig = {
      method,
      url: `${this.config.baseUrl}${url}`,
      data,
      headers: {
        'Content-Type': 'application/json',
        ...this.getDefaultHeaders(),
        ...headers,
      },
      timeout: this.config.timeout,
    };
    console.log(config)

    const circuitBreakerKey = `${this.getName()}_${method}_${url}`;

    return this.circuitBreakerService.execute(circuitBreakerKey, async () => {
      this.logger.debug(`Making ${method} request to ${config.url}`);
      const data = await lastValueFrom(this.httpService.request(config));
      console.log('Data from paystack ===> ', JSON.stringify(data.data));
      return data.data;
    });
  }

  protected abstract getDefaultHeaders(): Record<string, string>;

  protected handleError(error: any): PaymentResponse {
    this.logger.error(`Payment provider error:`, error.message, error.stack);

    if (error.response) {
      return {
        success: false,
        reference: '',
        message: error.response.data?.message || 'Payment provider error',
        data: error.response.data,
      };
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return {
        success: false,
        reference: '',
        message: 'Payment request timed out. Please check transaction status or try again.',
      };
    }

    return {
      success: false,
      reference: '',
      message: error.message || 'Network error',
    };
  }

  private getProviderConfig(providerName: PaymentProvider): PaymentProviderConfig {
    const providerConfig = this.configService.get(`payment.providers.${providerName}`);
    if (!providerConfig) {
      throw new Error(`Configuration not found for provider: ${providerName}`);
    }

    return {
      provider: providerName,
      baseUrl: providerConfig.baseUrl,
      timeout: providerConfig.timeout || 30000,
      credentials: providerConfig,
    };
  }
}
