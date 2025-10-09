import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Add request ID for tracking
    req.headers['x-request-id'] = req.headers['x-request-id'] || 
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Log request details
    this.logger.log(`${req.method} ${req.url}`, {
      requestId: req.headers['x-request-id'],
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    next();
  }
}