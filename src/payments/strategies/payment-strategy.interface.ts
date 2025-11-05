import { ChargeEntity } from '@/database/entities/charge.entity';
import { PaymentMethod } from '../../common/constants/payment.constants';

export interface PaymentRequest {
  amount: number;
  currency: string;
  email: string;
  phone?: string;
  reference: string;
  description: string;
  merchant_reference?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  reference: string;
  message: string;
  data?: Record<string, any>;
  requiresOtp?: boolean;
  authorizationUrl?: string;
  accessCode?: string;
  action_required?: string;
}

export interface IPaymentStrategy {
  getPaymentMethod(): PaymentMethod;
  processPayment(request: PaymentRequest & Record<string, any> | ChargeEntity): Promise<PaymentResponse>;
  verifyPayment(reference: string): Promise<PaymentResponse>;
}
