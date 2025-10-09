import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import {
  CircuitBreakerOptions,
  CircuitBreakerState,
} from '../../common/interfaces/circuit-breaker.interface';
import { CircuitBreakerException } from '../../common/exceptions/circuit-breaker.exception';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly options: CircuitBreakerOptions;

  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.options = {
      timeout: this.configService.get<number>('payment.circuitBreaker.timeout', 60000),
      errorThresholdPercentage: this.configService.get<number>('payment.circuitBreaker.errorThresholdPercentage', 50),
      resetTimeout: this.configService.get<number>('payment.circuitBreaker.resetTimeout', 30000),
      minimumNumberOfCalls: 10,
    };
  }

  async execute<T>(
    key: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    const state = await this.getState(key);

    if (state.state === 'OPEN') {
      if (Date.now() < state.nextAttempt) {
        this.logger.warn(`Circuit breaker is OPEN for ${key}`);
        if (fallback) {
          return fallback();
        }
        throw new CircuitBreakerException(`Circuit breaker is OPEN for ${key}`);
      } else {
        await this.transitionToHalfOpen(key);
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Operation timeout')), this.options.timeout)
        ),
      ]);

      await this.onSuccess(key);
      return result;
    } catch (error) {
      await this.onFailure(key);
      this.logger.error(`Circuit breaker operation failed for ${key}:`, error);
      
      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }

  private async getState(key: string): Promise<CircuitBreakerState> {
    const stateStr = await this.redis.get(`circuit_breaker:${key}`);
    if (!stateStr) {
      return {
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        nextAttempt: 0,
      };
    }
    return JSON.parse(stateStr);
  }

  private async setState(key: string, state: CircuitBreakerState): Promise<void> {
    await this.redis.setex(
      `circuit_breaker:${key}`,
      Math.ceil(this.options.resetTimeout / 1000),
      JSON.stringify(state),
    );
  }

  private async onSuccess(key: string): Promise<void> {
    const state = await this.getState(key);
    
    if (state.state === 'HALF_OPEN') {
      state.state = 'CLOSED';
      state.failureCount = 0;
      state.successCount = 0;
      this.logger.log(`Circuit breaker transitioned to CLOSED for ${key}`);
    } else {
      state.successCount += 1;
    }

    await this.setState(key, state);
  }

  private async onFailure(key: string): Promise<void> {
    const state = await this.getState(key);
    state.failureCount += 1;
    state.lastFailureTime = Date.now();

    const totalCalls = state.failureCount + state.successCount;
    const errorPercentage = (state.failureCount / totalCalls) * 100;

    if (
      totalCalls >= this.options.minimumNumberOfCalls &&
      errorPercentage >= this.options.errorThresholdPercentage
    ) {
      state.state = 'OPEN';
      state.nextAttempt = Date.now() + this.options.resetTimeout;
      this.logger.warn(`Circuit breaker transitioned to OPEN for ${key}`);
    }

    await this.setState(key, state);
  }

  private async transitionToHalfOpen(key: string): Promise<void> {
    const state = await this.getState(key);
    state.state = 'HALF_OPEN';
    state.failureCount = 0;
    state.successCount = 0;
    await this.setState(key, state);
    this.logger.log(`Circuit breaker transitioned to HALF_OPEN for ${key}`);
  }
}