export const PAYMENT_PROVIDERS = {
  PAYSTACK: 'paystack',
  STANBIC: 'stanbic',
  KLUMP: 'klump',
  FLUTTERWAVE: 'flutterwave',
  KNIP: 'knip',
} as const;

export const PAYMENT_METHODS = {
  CARD: 'card',
  BANK_TRANSFER: 'bank_transfer',
  USSD: 'ussd',
  QR: 'qr',
  MOBILE_MONEY: 'mobile_money',
  BNPL: 'bnpl',
} as const;

export const PAYMENT_ACTIONS = {
  CREATE_CHARGE: 'create_charge',
  VALIDATE_OTP: 'validate_otp',
  SUBMIT_VALIDATION: 'submit_validation',
  QUERY_CHARGE: 'query_charge',
  REFUND: 'refund',
  WEBHOOK: 'webhook',
} as const;

export const CURRENCY_CODES = {
  NGN: 'NGN',
  USD: 'USD',
  GBP: 'GBP',
  EUR: 'EUR',
} as const;

// Payment channel types
export const CHANNEL_TYPES = {
  CARD: 'card',
  MANDATE: 'mandate',
  MMO: 'mmo',
  USSD: 'ussd',
  PUSH: 'push',
  QR: 'qr',
  BNPL: 'bnpl',
  PAY_WITH_TRANSFER: 'pay_with_transfer',
} as const;

// Payment channel identifiers
export const CHANNEL_IDENTIFIERS = {
  CARD: 'card',
  PAYSTACK: 'paystack',
  STANBICIBTC: 'stanbicibtc',
  KONGAPAY: 'kongapay',
  PAYATTITUDE: 'payattitude',
  ALIPAY: 'alipay',
  LOAN: 'loan',
  MANDATE: 'mandate',
  USSD: 'ussd',
  QR: 'qr',
  PAY_WITH_TRANSFER: 'pay_with_transfer',
  BNPL: 'bnpl',
  KLUMP: 'klump',
  KNIP_SERVICE: 'knip_service',
  TRANSFER_PROVIDER_PAYGATEPLUS: 'paygateplus',
} as const;

// Transaction activities
export const TRANSACTION_ACTIVITIES = {
  MAKE_PAYMENT: 'MAKE_PAYMENT',
  OTP_VALIDATION: 'OTP_VALIDATION',
  CARD_ENROL: 'CARD_ENROL',
  RESEND_OTP: 'RESEND_OTP',
  CANCEL_CHARGE: 'CANCEL_CHARGE',
  REFUND_REQUESTED: 'REFUND_REQUESTED',
  WEBHOOK_RECEIVED: 'WEBHOOK_RECEIVED',
  SETTLEMENT: 'SETTLEMENT',
  MANUAL_SETTLEMENT: 'MANUAL_SETTLEMENT',
} as const;

// Transaction history descriptions
export const TRANSACTION_HISTORY = {
  PAYMENT: 'Payment initiated',
  OTP_SUBMITTED: 'OTP submitted for validation',
  CHARGE_CANCELLED: 'Charge cancelled by user',
  CHARGE_COMPLETED: 'Charge completed successfully',
  REFUND_INITIATED: 'Refund initiated',
  WEBHOOK_PROCESSED: 'Webhook processed',
  SETTLEMENT_COMPLETED: 'Settlement completed',
  MANDATE_VERIFICATION: 'Mandate verification',
  ENROLLMENT: 'Card enrollment',
} as const;

// Export type definitions
export type PaymentProvider = typeof PAYMENT_PROVIDERS[keyof typeof PAYMENT_PROVIDERS];
export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];
export type PaymentAction = typeof PAYMENT_ACTIONS[keyof typeof PAYMENT_ACTIONS];
export type CurrencyCode = typeof CURRENCY_CODES[keyof typeof CURRENCY_CODES];
export type ChannelType = typeof CHANNEL_TYPES[keyof typeof CHANNEL_TYPES];
export type ChannelIdentifier = typeof CHANNEL_IDENTIFIERS[keyof typeof CHANNEL_IDENTIFIERS];
export type TransactionActivity = typeof TRANSACTION_ACTIVITIES[keyof typeof TRANSACTION_ACTIVITIES];