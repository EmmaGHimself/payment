import { Injectable, Logger, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';

export interface LogContext {
  requestId?: string;
  userId?: string;
  merchantId?: string;
  chargeId?: number;
  provider?: string;
  action?: string;
  [key: string]: any;
}

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerUtil {
  private readonly winstonLogger: winston.Logger;
  private context: LogContext = {};

  constructor(private readonly configService: ConfigService) {
    this.winstonLogger = winston.createLogger({
      level: this.configService.get('LOG_LEVEL', 'info'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, context, stack, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            context: { ...this.context },
            stack,
            ...meta,
          });
        }),
      ),
      transports: [
        new winston.transports.Console({
          format: this.configService.get('NODE_ENV') === 'development'
            ? winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
              )
            : winston.format.json(),
        }),
        ...(this.configService.get('NODE_ENV') === 'production'
          ? [
              new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                maxsize: 5242880, // 5MB
                maxFiles: 10,
              }),
              new winston.transports.File({
                filename: 'logs/combined.log',
                maxsize: 5242880, // 5MB
                maxFiles: 10,
              }),
            ]
          : []),
      ],
    });
  }

  setContext(context: LogContext) {
    this.context = { ...this.context, ...context };
    return this;
  }

  clearContext() {
    this.context = {};
    return this;
  }

  log(message: string, context?: LogContext) {
    this.winstonLogger.info(message, { context });
  }

  error(message: string, error?: Error | string, context?: LogContext) {
    this.winstonLogger.error(message, {
      context,
      stack: error instanceof Error ? error.stack : undefined,
      error: error instanceof Error ? error.message : error,
    });
  }

  warn(message: string, context?: LogContext) {
    this.winstonLogger.warn(message, { context });
  }

  debug(message: string, context?: LogContext) {
    this.winstonLogger.debug(message, { context });
  }

  // Payment-specific logging methods
  logPaymentEvent(event: string, data: any, context?: LogContext) {
    this.log(`Payment Event: ${event}`, {
      ...context,
      event,
      eventData: this.sanitizePaymentData(data),
    });
  }

  logProviderCall(provider: string, action: string, request: any, response?: any, error?: Error) {
    const logData = {
      provider,
      action,
      request: this.sanitizePaymentData(request),
      response: response ? this.sanitizePaymentData(response) : undefined,
      success: !error,
      error: error?.message,
      duration: Date.now() - (request.startTime || Date.now()),
    };

    if (error) {
      this.error(`Provider call failed: ${provider}:${action}`, error, logData);
    } else {
      this.log(`Provider call successful: ${provider}:${action}`, logData);
    }
  }

  logChargeStateChange(chargeId: number, fromStatus: string, toStatus: string, context?: LogContext) {
    this.log(`Charge status changed: ${fromStatus} -> ${toStatus}`, {
      ...context,
      chargeId,
      fromStatus,
      toStatus,
      event: 'charge_status_change',
    });
  }

  private sanitizePaymentData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sensitiveFields = ['pan', 'cvv', 'pin', 'password', 'secret', 'token', 'authorization'];
    const sanitized = { ...data };

    const sanitizeObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          if (sensitiveFields.some(field => lowerKey.includes(field))) {
            result[key] = '[REDACTED]';
          } else if (typeof value === 'object') {
            result[key] = sanitizeObject(value);
          } else {
            result[key] = value;
          }
        }
        return result;
      }

      return obj;
    };

    return sanitizeObject(sanitized);
  }
}
