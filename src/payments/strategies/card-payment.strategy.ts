import { Injectable, Logger } from '@nestjs/common';
import { PaymentProviderFactory } from '../../providers/factory/payment-provider.factory';
import { IPaymentStrategy, PaymentRequest, PaymentResponse } from './payment-strategy.interface';
import { PAYMENT_METHODS, PAYMENT_PROVIDERS } from '../../common/constants/payment.constants';
import { MaskUtil } from '../../common/utils/mask.util';

@Injectable()
export class CardPaymentStrategy implements IPaymentStrategy {
  private readonly logger = new Logger(CardPaymentStrategy.name);

  constructor(private readonly paymentProviderFactory: PaymentProviderFactory) {}

  getPaymentMethod() {
    return PAYMENT_METHODS.CARD;
  }

  async processPayment(
    request: PaymentRequest & {
      pan: string;
      cvv: string;
      expiry: string;
      pin?: string;
      provider?: string;
    },
  ): Promise<PaymentResponse> {
    try {
      // Get payment provider (default to Paystack)
      const providerName = PAYMENT_PROVIDERS.PAYSTACK;
      const provider = this.paymentProviderFactory.getProvider(providerName);

      // Create charge with provider
      const result = await provider.createCharge({
        amount: request.amount,
        currency: request.currency,
        email: request.email,
        reference: request.reference,
        card: {
          cvv: request.cvv,
          number: request.pan,
          expiry_month: request.expiry.slice(0, 2),
          expiry_year: request.expiry.slice(2),
        },
        metadata: {
          ...request.metadata,
          payment_method: 'card',
          card_last_four: request.pan.slice(-4),
          card_scheme: MaskUtil.getCardScheme(request.pan),
        },
      });

      this.logger.log(`Card payment initiated: ${request.reference}`);

      return result;
    } catch (error) {
      this.logger.error(`Card payment failed: ${request.reference}`, error);
      return {
        success: false,
        reference: request.reference,
        message: error.message || 'Card payment failed',
      };
    }
  }

  async verifyPayment(reference: string): Promise<PaymentResponse> {
    try {
      const provider = this.paymentProviderFactory.getProvider(PAYMENT_PROVIDERS.PAYSTACK);
      const result = await provider.verifyTransaction(reference);

      return {
        success: result.success,
        reference,
        message: result.message,
        data: result.data,
      };
    } catch (error) {
      this.logger.error(`Card payment verification failed: ${reference}`, error);
      return {
        success: false,
        reference,
        message: error.message || 'Payment verification failed',
      };
    }
  }
}
