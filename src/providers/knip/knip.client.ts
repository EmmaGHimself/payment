import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import { CircuitBreakerService } from '../base/circuit-breaker.service';

@Injectable()
export class KnipClient {
  private readonly logger = new Logger(KnipClient.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {
    this.baseUrl = this.configService.get('payment.providers.eagle.baseUrl') + '/knip';
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
         'Content-Type': 'application/json',
        ...headers,
      },
    };

    const circuitBreakerKey = `knip${method}_${endpoint}`;

    try {
      const response = await this.circuitBreakerService.execute(circuitBreakerKey, async () => {
        this.logger.debug(`Making Knip API call: ${method} ${endpoint}`);
        return firstValueFrom(this.httpService.request(config));
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Knip API error: ${method} ${endpoint}`, error);
      throw error;
    }
  }
}
