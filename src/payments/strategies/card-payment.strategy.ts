import { Injectable, Logger } from '@nestjs/common';
import { PaymentProviderFactory } from '../../providers/factory/payment-provider.factory';
import { IPaymentStrategy, PaymentRequest, PaymentResponse } from './payment-strategy.interface';
import { PAYMENT_METHODS, PAYMENT_PROVIDERS } from '../../common/constants/payment.constants';
import { MaskUtil } from '../../common/utils/mask.util';
import { ChargeEntity } from '../../database/entities/charge.entity';

interface CardPaymentRequest extends PaymentRequest {
  pan: string;
  cvv: string;
  expiry: string;
  pin?: string;
  provider?: string;
  charge?: ChargeEntity;
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
        currency: 'NGN', // request.currency,
        email: request.email,
        reference: request.reference,
        merchant_reference: request.merchant_reference,
        card: {
          cvv: request.cvv,
          number: request.pan,
          expiry_month: request.expiry.slice(0, 2),
          expiry_year: request.expiry.slice(2),
        },
        pin: request.pin,
        metadata: {
          ...request.metadata,
          payment_method: PAYMENT_METHODS.CARD,
          card_last_four: request.pan.slice(-4),
          card_scheme: MaskUtil.getCardScheme(request.pan),
        },
        charge: request.charge,
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
