import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => {
  const eagleBaseUrl = process.env.EAGLE_BASE_URL;
  return {
    providers: {
      eagle: {
        baseUrl: eagleBaseUrl,
      },
      paystack: {
        baseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co',
        secretKey: process.env.PAYSTACK_SECRET_KEY,
        publicKey: process.env.PAYSTACK_PUBLIC_KEY,
        webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
        timeout: parseInt(process.env.PAYSTACK_TIMEOUT) || 30000,
      },
      stanbic: {
        baseUrl: process.env.STANBIC_BASE_URL,
        clientId: process.env.STANBIC_CLIENT_ID,
        clientSecret: process.env.STANBIC_CLIENT_SECRET,
        timeout: parseInt(process.env.STANBIC_TIMEOUT) || 30000,
      },
      klump: {
        baseUrl: process.env.KLUMP_BASE_URL,
        secretKey: process.env.KLUMP_SECRET_KEY,
        timeout: parseInt(process.env.KLUMP_TIMEOUT) || 30000,
      },
      flutterwave: {
        baseUrl: process.env.FLUTTERWAVE_BASE_URL,
        secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
        timeout: parseInt(process.env.FLUTTERWAVE_TIMEOUT) || 30000,
      },
      knip: {
        baseUrl: eagleBaseUrl + '/knip',
        callback_url: process.env.KNIP_CALLBACK_URL,
        settlement_account: process.env.KNIP_SETTLEMENT_ACCOUNT,
        timeout: parseInt(process.env.KNIP_TIMEOUT) || 30000,
      },
    },
    circuitBreaker: {
      timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT) || 60000,
      errorThresholdPercentage: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD) || 50,
      resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT) || 30000,
    },
    fees: {
      percentage: parseFloat(process.env.DEFAULT_FEE_PERCENTAGE) || 1.5,
      cap: parseFloat(process.env.DEFAULT_FEE_CAP) || 2000,
    },
    encryption: {
      algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-cbc',
      secretKey: process.env.ENCRYPTION_SECRET_KEY,
    },
  };
});
