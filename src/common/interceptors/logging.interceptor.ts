import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, headers } = request;
    const start = Date.now();

    const maskedHeaders = {
      ...headers,
      authorization: headers.authorization ? '[MASKED]' : undefined,
      'integration-secret-key': headers['integration-secret-key'] ? '[MASKED]' : undefined,
    };

    this.logger.log(`Incoming Request: ${method} ${url}`, {
      headers: maskedHeaders,
      body: this.maskSensitiveData(request.body),
    });

    return next.handle().pipe(
      tap((response) => {
        const duration = Date.now() - start;
        this.logger.log(`Request completed: ${method} ${url} - ${duration}ms`);
      }),
    );
  }

  private maskSensitiveData(data: any): any {
    if (!data) return data;

    const sensitiveFields = ['pan', 'cvv', 'pin', 'password', 'secret', 'token'];
    const masked = { ...data };

    for (const field of sensitiveFields) {
      if (masked[field]) {
        masked[field] = '[MASKED]';
      }
    }

    return masked;
  }
}