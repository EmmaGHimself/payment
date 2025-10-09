import { Injectable } from '@nestjs/common';
import { PaystackService } from '../paystack/paystack.service';
import { IPaymentProvider } from '../../common/interfaces/payment-provider.interface';
import { PaymentProvider, PAYMENT_PROVIDERS } from '../../common/constants/payment.constants';
import { KnipService } from '../knip/knip.service';

@Injectable()
export class PaymentProviderFactory {
  constructor(
    private readonly paystackService: PaystackService,
    private readonly KnipService: KnipService
  ) {}

  getProvider(providerName: PaymentProvider): IPaymentProvider {
    switch (providerName) {
      case PAYMENT_PROVIDERS.PAYSTACK:
        return this.paystackService;
      default:
        throw new Error(`Unsupported payment provider: ${providerName}`);
    }
  }
  getTransferProvider(providerName: PaymentProvider) {
    switch(providerName) {
      case PAYMENT_PROVIDERS.KNIP:
        return this.KnipService;
      default:
        throw new Error(`Unsupported payment provider: ${providerName}`);
    }
  }

  getAllProviders(): IPaymentProvider[] {
    return [
      this.paystackService,
    ];
  }
}