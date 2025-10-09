export * from './payment.constants';
export * from './status.constants';
export * from './error.constants';

// Additional constants that might be referenced in your existing code
export const TERMINATE_REQUEST = 'terminate';
export const VALIDATE_OTP = 'validate_otp';
export const NGN_CURRENCY = 'NGN';
export const NGN_CURRENCY_CODE = 'NGN';
export const DEFAULT_TRANSACTION_EXPIRY_TIME_IN_MIN = 30;
export const TEST_PAYMENT_ID = 'test_payment_123';
export const TOKEN_ERROR = 'TokenExpiredError';

// Service names
export const SERVICES = {
  PAYSTACK: 'paystack',
  RAVE_SERVICE: 'rave',
  ACCESS_SERVICE: 'access',
  CYBS_SERVICE: 'cybersource',
  KLUMP: 'klump',
  STANBICIBTC: 'stanbicibtc',
  KNIP_SERVICE: 'knip',
} as const;

// Discount types
export const DISCOUNT_TYPES = {
  USER_DEFINED: 'user_defined',
  MERCHANT_DEFINED: 'merchant_defined',
  SYSTEM_DEFINED: 'system_defined',
} as const;

// Fee bearer types
export const FEE_BEARER = {
  CLIENT: 'client',
  MERCHANT: 'merchant',
} as const;

export type ServiceName = typeof SERVICES[keyof typeof SERVICES];
export type DiscountType = typeof DISCOUNT_TYPES[keyof typeof DISCOUNT_TYPES];
export type FeeBearerType = typeof FEE_BEARER[keyof typeof FEE_BEARER];