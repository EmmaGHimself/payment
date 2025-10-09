import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ERROR_CODES, ERROR_MESSAGES } from '../constants/error.constants';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

 catch(exception: any, host: ArgumentsHost) {
  const ctx = host.switchToHttp();
  const response = ctx.getResponse<Response>();
  const request = ctx.getRequest<Request>();

  let status = HttpStatus.INTERNAL_SERVER_ERROR;
  let message: string = ERROR_MESSAGES.INTERNAL_SERVER_ERROR; // Explicitly type as string
  let code: string = ERROR_CODES.INTERNAL_SERVER_ERROR; // Explicitly type as string

  if (exception instanceof HttpException) {
    status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    
    if (typeof exceptionResponse === 'object') {
      message = (exceptionResponse as any).message || exception.message;
      code = (exceptionResponse as any).error || (exceptionResponse as any).code || ERROR_CODES.INTERNAL_SERVER_ERROR;
    } else {
      message = exceptionResponse as string;
      code = ERROR_CODES.INTERNAL_SERVER_ERROR;
    }
  }

  // Log error
  this.logger.error(
    `HTTP ${status} Error: ${message}`,
    exception.stack,
    `${request.method} ${request.url}`,
  );

  const errorResponse = {
    statusCode: status,
    message,
    code,
    timestamp: new Date().toISOString(),
    path: request.url,
    method: request.method,
  };

  response.status(status).json(errorResponse);
}
}