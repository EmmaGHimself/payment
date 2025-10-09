import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import { CircuitBreakerService } from '../base/circuit-breaker.service';

@Injectable()
export class PaystackClient {
  private readonly logger = new Logger(PaystackClient.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {
    this.baseUrl = this.configService.get<string>('payment.providers.paystack.baseUrl');
    this.secretKey = this.configService.get<string>('payment.providers.paystack.secretKey');
  }

  async makeRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      method,
      url: `${this.baseUrl}${endpoint}`,
      data,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const circuitBreakerKey = `paystack_${method}_${endpoint}`;

    try {
      const response = await this.circuitBreakerService.execute(
        circuitBreakerKey,
        async () => {
          this.logger.debug(`Making Paystack API call: ${method} ${endpoint}`);
          return firstValueFrom(this.httpService.request(config));
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Paystack API error: ${method} ${endpoint}`, error);
      throw error;
    }
  }
}
