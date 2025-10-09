import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error.constants';

export class PaymentException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly errorCode?: ErrorCode,
  ) {
    super(
      {
        statusCode,
        message,
        error: errorCode || 'PaymentError',
      },
      statusCode,
    );
  }
}
