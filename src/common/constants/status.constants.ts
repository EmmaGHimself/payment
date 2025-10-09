export const CHARGE_STATUS = {
  PENDING: 'pending',
  SUCCESSFUL: 'successful',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PROCESSING: 'processing',
  EXPIRED: 'expired',
  COMPLETED: 'completed',
  SUCCESS: 'success',
} as const;

export const PAYMENT_REQUEST_STATUS = {
  ENABLED: 'enabled',
  DISABLED: 'disabled',
  EXPIRED: 'expired',
  SUCCESS: 'success',
} as const;

export const WEBHOOK_EVENT_TYPES = {
  CHARGE_SUCCESS: 'charge.success',
  CHARGE_FAILED: 'charge.failed',
  CHARGE_COMPLETED: 'charge.completed',
  TRANSFER_SUCCESS: 'transfer.success',
  TRANSFER_FAILED: 'transfer.failed',
  PAYSTACK_WEBHOOK: 'paystack.webhook',
  KLUMP_WEBHOOK: 'klump.webhook',
  RAVE_WEBHOOK: 'rave.webhook',
} as const;

export const CIRCUIT_BREAKER_STATES = {
  CLOSED: 'closed',
  OPEN: 'open',
  HALF_OPEN: 'half_open',
} as const;

// Service statuses
export const SERVICE_STATUS = {
  ENABLED: 'enabled',
  DISABLED: 'disabled',
  MAINTENANCE: 'maintenance',
} as const;

// OTP and validation statuses
export const OTP_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  EXPIRED: 'expired',
  FAILED: 'failed',
} as const;

// Export type definitions
export type ChargeStatus = typeof CHARGE_STATUS[keyof typeof CHARGE_STATUS];
export type PaymentRequestStatus = typeof PAYMENT_REQUEST_STATUS[keyof typeof PAYMENT_REQUEST_STATUS];
export type WebhookEventType = typeof WEBHOOK_EVENT_TYPES[keyof typeof WEBHOOK_EVENT_TYPES];
export type CircuitBreakerState = typeof CIRCUIT_BREAKER_STATES[keyof typeof CIRCUIT_BREAKER_STATES];
export type ServiceStatus = typeof SERVICE_STATUS[keyof typeof SERVICE_STATUS];
export type OtpStatus = typeof OTP_STATUS[keyof typeof OTP_STATUS];