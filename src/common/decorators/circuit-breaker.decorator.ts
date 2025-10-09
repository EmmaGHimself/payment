import { SetMetadata } from '@nestjs/common';

export const CIRCUIT_BREAKER_KEY = 'circuitBreaker';

export interface CircuitBreakerOptions {
  key: string;
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  fallback?: () => Promise<any>;
}

export const CircuitBreaker = (options: CircuitBreakerOptions) => 
  SetMetadata(CIRCUIT_BREAKER_KEY, options);
