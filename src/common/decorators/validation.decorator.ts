import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import { IsOptional, ValidateIf } from 'class-validator';

// Custom validation decorator for payment amounts
export function IsPaymentAmount() {
  return applyDecorators(
    Transform(({ value }) => {
      if (typeof value === 'string') {
        const numValue = parseFloat(value);
        return isNaN(numValue) ? value : numValue;
      }
      return value;
    }),
    ValidateIf((o, value) => value !== null && value !== undefined && value !== ''),
  );
}

// Decorator for masking sensitive fields in logs
export function MaskSensitiveData(fields: string[] = []) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    descriptor.value = function (...args: any[]) {
      // Mask sensitive fields before logging
      const maskedArgs = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          const masked = { ...arg };
          fields.forEach(field => {
            if (masked[field]) {
              masked[field] = '[MASKED]';
            }
          });
          return masked;
        }
        return arg;
      });
      return method.apply(this, maskedArgs);
    };
  };
}

// Decorator for automatic retry logic
export function Retry(attempts: number = 3, delay: number = 1000) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      let lastError;
      for (let i = 0; i < attempts; i++) {
        try {
          return await method.apply(this, args);
        } catch (error) {
          lastError = error;
          if (i < attempts - 1) {
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
          }
        }
      }
      throw lastError;
    };
  };
}