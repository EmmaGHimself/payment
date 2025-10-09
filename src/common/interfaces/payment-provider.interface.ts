import { PaymentAction, PaymentProvider } from '../constants/payment.constants';

export interface PaymentProviderConfig {
  provider: PaymentProvider;
  baseUrl: string;
  timeout: number;
  credentials: Record<string, string>;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  email: string;
  reference: string;
  card?: {
    cvv: string;
    number: string;
    expiry_month: string;
    expiry_year: string;
  };
  metadata?: Record<string, any>;
  merchant_name?: string;
}

export interface PaymentResponse {
  success: boolean;
  reference: string;
  card?: {
    cvv: string;
    number: string;
    expiry_month: string;
    expiry_year: string;
  };
  authorizationUrl?: string;
  accessCode?: string;
  message: string;
  data?: Record<string, any>;
  action_required?: string;
}

export interface IPaymentProvider {
  getName(): PaymentProvider;
  createCharge(request: PaymentRequest): Promise<PaymentResponse>;
  verifyTransaction(reference: string): Promise<PaymentResponse>;
  submitValidation(reference: string, data: Record<string, any>): Promise<PaymentResponse>;
  processWebhook(payload: Record<string, any>, signature: string): Promise<PaymentResponse>;
}
