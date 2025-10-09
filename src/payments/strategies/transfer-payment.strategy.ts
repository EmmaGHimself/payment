import { Injectable, Logger } from '@nestjs/common';
import { IPaymentStrategy, PaymentRequest, PaymentResponse } from './payment-strategy.interface';
import { PAYMENT_METHODS, PAYMENT_PROVIDERS } from '../../common/constants/payment.constants';
import { HashUtil } from '../../common/utils/hash.util';
// import { PaymentProvider } from '../../../dist/common/constants/payment.constants';
import { PaymentProviderFactory } from '../../providers/factory/payment-provider.factory';

@Injectable()
export class TransferPaymentStrategy implements IPaymentStrategy {
  constructor(private readonly paymentProviderFactory: PaymentProviderFactory) {}
  private readonly logger = new Logger(TransferPaymentStrategy.name);

  getPaymentMethod() {
    return PAYMENT_METHODS.BANK_TRANSFER;
  }

  async processPayment(
    request: PaymentRequest & {
      customerName: string;
      provider?: string;
      merchant_name?: string;
    },
  ): Promise<any> {
    try {
      const providerName = PAYMENT_PROVIDERS.KNIP;
      const provider = this.paymentProviderFactory.getTransferProvider(providerName);
      const result = await provider.createCharge(request);
      this.logger.log(`Transfer payment initiated: ${request.reference}`);
      return result;
    } catch (err) {
      this.logger.error(`Transfer payment failed: ${request.reference}`, err);
      return {
        success: false,
        reference: request.reference,
        message: err.message || 'Transfer payment failed',
      };
    }
  }

  async verifyPayment(reference: string): Promise<PaymentResponse> {
    // In a real implementation, this would check with the bank/provider
    return {
      success: true,
      reference,
      message: 'Transfer verification not yet implemented',
      data: { status: 'pending' },
    };
  }

  private generateVirtualAccount(): string {
    // Generate a 10-digit account number starting with 9
    return `9${Math.random().toString().slice(2, 11)}`;
  }
}
