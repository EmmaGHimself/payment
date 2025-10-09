import { ChargeStatus } from '../../common/constants/status.constants';
import { CurrencyCode } from '../../common/constants/payment.constants';

export interface ICharge {
  id: number;
  identifier: string;
  amount: number;
  originalAmount?: number;
  currency: CurrencyCode;
  description: string;
  email: string;
  phone?: string;
  customerId: string;
  merchantId: string;
  merchantName: string;
  status: ChargeStatus;
  successful: boolean;
  settled: boolean;
  service?: string;
  channelId?: number;
  chargeInfoId?: number;
  callback?: string;
  livemode: boolean;
  source?: string;
  otpCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChargeInfo {
  id: number;
  amount: number;
  merchantReference: string;
  customerId: string;
  description: string;
  email: string;
  phone?: string;
  callback?: string;
  settlementAccount?: string;
  livemode: boolean;
  currency: CurrencyCode;
  merchantId: string;
  integrationId?: number;
  merchantName: string;
  logoUrl?: string;
  status: string;
  identifier: string;
  discountAmount?: number;
  discountInfo?: Record<string, any>;
  discounted: boolean;
  paymentRequestId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChargeHistory {
  id: number;
  chargeId: number;
  description: string;
  responseMessage: string;
  status: ChargeStatus;
  activity: string;
  response?: Record<string, any>;
  createdAt: Date;
}

export interface IChargeMetadata {
  id: number;
  chargeId: number;
  name: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChargeRequest {
  amount: string;
  description: string;
  hash: string;
  merchant_id?: string;
  public_key?: string;
  reference: string;
  customer_id: string;
  email: string;
  phone?: string;
  callback?: string;
  currency?: CurrencyCode;
  discount?: {
    amount?: number;
    channel?: string;
    product_id?: string;
  };
  paymentRequest?: string;
}

export interface ChargeResponse {
  merchant_name: string;
  charge_info_id: number;
  merchant_logo_url?: string;
  charge_identifier: string;
  channels: any[];
  view_url: string;
  callback?: string;
  phone?: string;
  email: string;
  amount: number;
  currency: CurrencyCode;
  reference: string;
}

export interface OtpValidationRequest {
  identifier: string;
  otp: string;
}

export interface RefundRequest {
  amount: number;
  reference: string;
  merchant_id: string;
  live_mode?: boolean;
}