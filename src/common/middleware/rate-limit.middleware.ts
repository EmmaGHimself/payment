import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const identifier = this.getIdentifier(req);
    const key = `rate_limit:${identifier}`;
    const limit = 100; // requests per minute
    const window = 60; // seconds

    try {
      const current = await this.redis.incr(key);
      
      if (current === 1) {
        await this.redis.expire(key, window);
      }

      if (current > limit) {
        this.logger.warn(`Rate limit exceeded for ${identifier}`);
        return res.status(429).json({
          statusCode: 429,
          message: 'Too many requests',
          retryAfter: window,
        });
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current));
      res.setHeader('X-RateLimit-Reset', Date.now() + (window * 1000));
      
    } catch (error) {
      this.logger.error('Rate limiting error:', error);
      // Continue without rate limiting on Redis errors
    }

    next();
  }

  private getIdentifier(req: Request): string {
    // Use integration key if available, otherwise fall back to IP
    const secretKey = req.headers['integration-secret-key'] as string;
    if (secretKey) {
      return `integration:${secretKey.substring(0, 8)}`;
    }
    
    return `ip:${req.ip}`;
  }
}