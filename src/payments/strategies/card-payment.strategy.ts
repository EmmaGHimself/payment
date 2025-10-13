import { Injectable, Logger } from '@nestjs/common';
import { PaymentProviderFactory } from '../../providers/factory/payment-provider.factory';
import { IPaymentStrategy, PaymentRequest, PaymentResponse } from './payment-strategy.interface';
import { PAYMENT_METHODS, PAYMENT_PROVIDERS } from '../../common/constants/payment.constants';
import { MaskUtil } from '../../common/utils/mask.util';

interface CardPaymentRequest extends PaymentRequest {
  pan: string;
  cvv: string;
  expiry: string;
  pin?: string;
  provider?: string;
}

@Injectable()
export class CardPaymentStrategy implements IPaymentStrategy {
  private readonly logger = new Logger(CardPaymentStrategy.name);
  private readonly providerName = PAYMENT_PROVIDERS.PAYSTACK;

  constructor(private readonly paymentProviderFactory: PaymentProviderFactory) {}

  getPaymentMethod() {
    return PAYMENT_METHODS.CARD;
  }

  async processPayment(request: CardPaymentRequest): Promise<PaymentResponse> {
    try {
      const provider = this.paymentProviderFactory.getProvider(this.providerName);
      const result = await provider.createCharge({
        amount: request.amount,
        currency: request.currency,
        email: request.email,
        reference: request.reference,
        merchant_reference: request.merchant_reference,
        card: {
          cvv: request.cvv,
          number: request.pan,
          expiry_month: request.expiry.slice(0, 2),
          expiry_year: request.expiry.slice(2),
        },
        metadata: {
          ...request.metadata,
          payment_method: PAYMENT_METHODS.CARD,
          card_last_four: request.pan.slice(-4),
          card_scheme: MaskUtil.getCardScheme(request.pan),
        },
      });
      return result;
    } catch (error) {
      this.logger.error(`Card payment failed: ${request.reference}`, error.stack);
      throw new Error(error.message);
    }
  }

  async verifyPayment(reference: string): Promise<PaymentResponse> {
    try {
      const provider = this.paymentProviderFactory.getProvider(this.providerName);
      const result = await provider.verifyTransaction(reference);

      return {
        success: result.success,
        reference,
        message: result.message,
        data: result.data,
      };
    } catch (error) {
      this.logger.error(`Card payment verification failed: ${reference}`, error.stack);
      return {
        success: false,
        reference,
        message: error.message || 'Payment verification failed',
      };
    }
  }
}


console.log({
  message: 'Request failed with status code 400',
  name: 'AxiosError',
  stack:
    'AxiosError: Request failed with status code 400\n    at settle (/Users/adebayoayomide/Desktop/KongaPay/payment/node_modules/.pnpm/axios@1.12.2/node_modules/axios/lib/core/settle.js:19:12)\n    at IncomingMessage.handleStreamEnd (/Users/adebayoayomide/Desktop/KongaPay/payment/node_modules/.pnpm/axios@1.12.2/node_modules/axios/lib/adapters/http.js:617:11)\n    at IncomingMessage.emit (node:events:536:35)\n    at endReadableNT (node:internal/streams/readable:1698:12)\n    at process.processTicksAndRejections (node:internal/process/task_queues:90:21)\n    at Axios.request (/Users/adebayoayomide/Desktop/KongaPay/payment/node_modules/.pnpm/axios@1.12.2/node_modules/axios/lib/core/Axios.js:45:41)\n    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)',
  config: {
    transitional: { silentJSONParsing: true, forcedJSONParsing: true, clarifyTimeoutError: false },
    adapter: ['xhr', 'http', 'fetch'],
    transformRequest: [null],
    transformResponse: [null],
    timeout: 30000,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    maxContentLength: -1,
    maxBodyLength: -1,
    env: {},
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Authorization: 'Bearer sk_test_eb18b1fe1f6813fed8a819172fef92e2ae34284e',
      'User-Agent': 'axios/1.12.2',
      'Content-Length': '401',
      'Accept-Encoding': 'gzip, compress, deflate, br',
    },
    method: 'post',
    url: 'https://api.paystack.co/charge',
    data: '{"email":"ops@kongapay.com","amount":18058,"reference":"CH_2025101365635_VVFUS3","currency":"NGN","card":{"cvv":"001","number":"4084080000005408","expiry_month":"10","expiry_year":"26"},"metadata":{"custom_fields":[{"display_name":"Merchant reference","variable_name":"merchant_reference","value":"4vXoE"},{"display_name":"Identifier","variable_name":"identifier","value":"CH_2025101365635_VVFUS3"}]}}',
    cancelToken: {
      promise: {},
      _listeners: null,
      reason: {
        message: 'canceled',
        name: 'CanceledError',
        stack:
          'CanceledError: canceled\n    at Object.cancel (/Users/adebayoayomide/Desktop/KongaPay/payment/node_modules/.pnpm/axios@1.12.2/node_modules/axios/lib/cancel/CancelToken.js:60:22)\n    at /Users/adebayoayomide/Desktop/KongaPay/payment/node_modules/.pnpm/@nestjs+axios@3.1.3_@nestjs+common@10.4.20_class-transformer@0.5.1_class-validator@0.14.2_ref_py4mq6y5kaf6dhfjofgk5rx5fe/node_modules/@nestjs/axios/dist/http.service.js:84:34\n    at execFinalizer (/Users/adebayoayomide/Desktop/KongaPay/payment/node_modules/.pnpm/rxjs@7.8.2/node_modules/rxjs/src/internal/Subscription.ts:208:5)\n    at SafeSubscriber.Subscription.unsubscribe (/Users/adebayoayomide/Desktop/KongaPay/payment/node_modules/.pnpm/rxjs@7.8.2/node_modules/rxjs/src/internal/Subscription.ts:80:13)\n    at SafeSubscriber.Subscriber.unsubscribe (/Users/adebayoayomide/Desktop/KongaPay/payment/node_modules/.pnpm/rxjs@7.8.2/node_modules/rxjs/src/internal/Subscriber.ts:107:24)\n    at SafeSubscriber.Subscriber._error (/Users/adebayoayomide/Desktop/KongaPay/payment/node_modules/.pnpm/rxjs@7.8.2/node_modules/rxjs/src/internal/Subscriber.ts:120:12)\n    at SafeSubscriber.Subscriber.error (/Users/adebayoayomide/Desktop/KongaPay/payment/node_modules/.pnpm/rxjs@7.8.2/node_modules/rxjs/src/internal/Subscriber.ts:86:12)\n    at /Users/adebayoayomide/Desktop/KongaPay/payment/node_modules/.pnpm/@nestjs+axios@3.1.3_@nestjs+common@10.4.20_class-transformer@0.5.1_class-validator@0.14.2_ref_py4mq6y5kaf6dhfjofgk5rx5fe/node_modules/@nestjs/axios/dist/http.service.js:77:28\n    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)',
        code: 'ERR_CANCELED',
      },
    },
    allowAbsoluteUrls: true,
  },
  code: 'ERR_BAD_REQUEST',
  status: 400,
});