import { Injectable, BadRequestException } from '@nestjs/common';
import { z, ZodSchema, ZodError } from 'zod';

@Injectable()
export class ValidationService {
  validate<T>(schema: ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        throw new BadRequestException({
          message: 'Validation failed',
          errors,
        });
      }
      throw error;
    }
  }

  async validateAsync<T>(schema: ZodSchema<T>, data: unknown): Promise<T> {
    try {
      return await schema.parseAsync(data);
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        throw new BadRequestException({
          message: 'Validation failed',
          errors,
        });
      }
      throw error;
    }
  }

  isValid<T>(schema: ZodSchema<T>, data: unknown): boolean {
    return schema.safeParse(data).success;
  }

  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  redactPII(text: string): string {
    const patterns = [
      /\b\d{13,19}\b/g,
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      /\b\d{3}-\d{2}-\d{4}\b/g,
      /\b\d{10}\b/g,
    ];

    let redacted = text;
    patterns.forEach(pattern => {
      redacted = redacted.replace(pattern, '****REDACTED****');
    });

    return redacted;
  }

  validateCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\s/g, '');
    
    if (!/^\d{13,19}$/.test(cleaned)) {
      return false;
    }

    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  validateMCC(mcc: string): boolean {
    return /^\d{4}$/.test(mcc);
  }

  validateCurrency(currency: string): boolean {
    const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'AUD', 'CAD'];
    return validCurrencies.includes(currency.toUpperCase());
  }
}