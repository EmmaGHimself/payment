import { Injectable, OnModuleInit } from '@nestjs/common';
import { PaystackService } from '../paystack/paystack.service';
import { IPaymentProvider } from '../../common/interfaces/payment-provider.interface';
import { PaymentProvider, PAYMENT_PROVIDERS } from '../../common/constants/payment.constants';

@Injectable()
export class ProviderRegistryService implements OnModuleInit {
  private readonly providers = new Map<PaymentProvider, IPaymentProvider>();

  constructor(
    private readonly paystackService: PaystackService,
  ) {}

  onModuleInit() {
    // Register all available providers
    this.registerProvider(PAYMENT_PROVIDERS.PAYSTACK, this.paystackService);
  }

  private registerProvider(name: PaymentProvider, provider: IPaymentProvider) {
    this.providers.set(name, provider);
  }

  getProvider(name: PaymentProvider): IPaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Payment provider not found: ${name}`);
    }
    return provider;
  }

  getAllProviders(): IPaymentProvider[] {
    return Array.from(this.providers.values());
  }

  getAvailableProviders(): PaymentProvider[] {
    return Array.from(this.providers.keys());
  }
}