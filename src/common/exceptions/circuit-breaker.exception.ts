import { HttpException, HttpStatus } from '@nestjs/common';

export class CircuitBreakerException extends HttpException {
  constructor(message: string = 'Service temporarily unavailable') {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message,
        error: 'Circuit Breaker Open',
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}