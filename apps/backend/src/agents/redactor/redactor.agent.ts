import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentContext } from '../base.agent';
import { LoggerService } from '../../common/services/logger.service';
import { MetricsService } from '../../common/services/metrics.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedactorAgent extends BaseAgent {
  protected name = 'redactor';

  constructor(
    logger: LoggerService,
    metrics: MetricsService,
    configService: ConfigService,
  ) {
    super(logger, metrics, {
      maxRetries: configService.get('agents.maxRetries', 2),
      timeoutMs: configService.get('agents.timeoutMs', 1000),
      circuitBreakerThreshold: configService.get('agents.circuitBreakerThreshold', 3),
      circuitBreakerCooldownMs: configService.get('agents.circuitBreakerCooldownMs', 30000),
    });
  }

  protected async process(context: AgentContext, input: any): Promise<any> {
    const redacted = this.redactObject(input);
    const stats = this.getRedactionStats(input, redacted);

    return {
      data: redacted,
      stats,
      redactionApplied: stats.totalRedacted > 0,
    };
  }

  private redactObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.redactString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.redactObject(item));
    }

    if (obj && typeof obj === 'object') {
      const redacted: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        if (this.isSensitiveField(key)) {
          redacted[key] = '****REDACTED****';
        } else {
          redacted[key] = this.redactObject(value);
        }
      }
      
      return redacted;
    }

    return obj;
  }

  private redactString(text: string): string {
    const patterns = [
      {
        pattern: /\b\d{13,19}\b/g,
        replacement: '****REDACTED_CARD****',
      },
      {
        pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        replacement: '****REDACTED_SSN****',
      },
      {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: '****REDACTED_EMAIL****',
      },
      {
        pattern: /\b\d{10}\b/g,
        replacement: '****REDACTED_PHONE****',
      },
      {
        pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        replacement: '****REDACTED_IP****',
      },
    ];

    let redacted = text;
    
    for (const { pattern, replacement } of patterns) {
      redacted = redacted.replace(pattern, replacement);
    }

    return redacted;
  }

  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password',
      'secret',
      'token',
      'apiKey',
      'api_key',
      'creditCard',
      'credit_card',
      'cardNumber',
      'card_number',
      'cvv',
      'ssn',
      'socialSecurity',
      'social_security',
      'email',
      'phoneNumber',
      'phone_number',
      'address',
      'dateOfBirth',
      'date_of_birth',
    ];

    const lowerField = fieldName.toLowerCase();
    return sensitiveFields.some(field => lowerField.includes(field.toLowerCase()));
  }

  private getRedactionStats(original: any, redacted: any): any {
    const originalStr = JSON.stringify(original);
    const redactedStr = JSON.stringify(redacted);
    
    const totalRedacted = (redactedStr.match(/\*\*\*\*REDACTED/g) || []).length;
    
    return {
      totalRedacted,
      cards: (redactedStr.match(/REDACTED_CARD/g) || []).length,
      emails: (redactedStr.match(/REDACTED_EMAIL/g) || []).length,
      phones: (redactedStr.match(/REDACTED_PHONE/g) || []).length,
      ssns: (redactedStr.match(/REDACTED_SSN/g) || []).length,
      ips: (redactedStr.match(/REDACTED_IP/g) || []).length,
      fields: (redactedStr.match(/\*\*\*\*REDACTED\*\*\*\*/g) || []).length,
    };
  }
}