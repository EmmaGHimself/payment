export interface IMerchant {
  id: number;
  externalId: string;
  name: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  webhookUrl?: string;
  status: string;
  livePublicKey?: string;
  testPublicKey?: string;
  liveSecretKey?: string;
  testSecretKey?: string;
  paymentGatewayChannel?: Record<string, any>;
  businessTransactionAmountLimit?: number;
  configs?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}