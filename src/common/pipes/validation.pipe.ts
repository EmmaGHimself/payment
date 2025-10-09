import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(CustomValidationPipe.name);

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    if (errors.length > 0) {
      const errorMessages = this.buildErrorMessage(errors);
      this.logger.warn(`Validation failed: ${errorMessages}`);
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: errorMessages,
      });
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private buildErrorMessage(errors: ValidationError[]): string[] {
    const messages: string[] = [];
    
    errors.forEach(error => {
      if (error.constraints) {
        messages.push(...Object.values(error.constraints));
      }
      
      if (error.children && error.children.length > 0) {
        messages.push(...this.buildErrorMessage(error.children));
      }
    });
    
    return messages;
  }
}

// Payment-specific validation pipe
@Injectable()
export class PaymentValidationPipe implements PipeTransform {
  private readonly logger = new Logger(PaymentValidationPipe.name);

  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type === 'body' && value) {
      // Validate payment amount format
      if (value.amount) {
        const amount = parseFloat(value.amount);
        if (isNaN(amount) || amount <= 0) {
          throw new BadRequestException('Invalid payment amount');
        }
        if (amount > 10000000) { // 100M kobo = 1M naira
          throw new BadRequestException('Payment amount exceeds maximum limit');
        }
      }

      // Validate email format more strictly for payments
      if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
        throw new BadRequestException('Invalid email format for payment processing');
      }

      // Validate phone number format (Nigerian numbers)
      if (value.phone && !/^(\+234|234|0)?[789][01]\d{8}$/.test(value.phone.replace(/\s/g, ''))) {
        this.logger.warn(`Invalid phone number format: ${value.phone}`);
      }

      // Validate reference format
      if (value.reference && !/^[a-zA-Z0-9_-]+$/.test(value.reference)) {
        throw new BadRequestException('Reference must contain only alphanumeric characters, hyphens, and underscores');
      }
    }

    return value;
  }
}
