import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentContext } from '../base.agent';
import { LoggerService } from '../../common/services/logger.service';
import { MetricsService } from '../../common/services/metrics.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ComplianceAgent extends BaseAgent {
  protected name = 'compliance';

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
    const checks = {
      otpRequired: this.checkOtpRequirement(input),
      consentRequired: this.checkConsentRequirement(input),
      limitsExceeded: this.checkLimits(input),
      piiProtected: this.checkPiiProtection(input),
    };

    const violations = this.findViolations(checks);
    const approved = violations.length === 0;

    return {
      approved,
      checks,
      violations,
      recommendations: this.getRecommendations(checks, violations),
      blockedAction: !approved ? input.action : null,
      reason: !approved ? violations.join('; ') : null,
    };
  }

  private checkOtpRequirement(input: any): boolean {
    if (input.action === 'FREEZE_CARD') return true;
    if (input.action === 'UNFREEZE_CARD') return true;
    if (input.amount && Number(input.amount) > 1000) return true;
    if (input.riskScore && input.riskScore > 0.6) return true;
    return false;
  }

  private checkConsentRequirement(input: any): boolean {
    if (input.action === 'CONTACT_CUSTOMER') return true;
    if (input.action === 'SHARE_DATA') return true;
    if (input.action === 'CREATE_DISPUTE') return true;
    return false;
  }

  private checkLimits(input: any): any {
    const limits = {
      daily: 10000,
      transaction: 5000,
      hourly: 2000,
    };

    const exceeded = [];
    
    if (input.amount) {
      if (Number(input.amount) > limits.transaction) {
        exceeded.push(`Transaction limit ($${limits.transaction})`);
      }
    }

    if (input.dailyTotal && Number(input.dailyTotal) > limits.daily) {
      exceeded.push(`Daily limit ($${limits.daily})`);
    }

    if (input.hourlyTotal && Number(input.hourlyTotal) > limits.hourly) {
      exceeded.push(`Hourly limit ($${limits.hourly})`);
    }

    return {
      exceeded: exceeded.length > 0,
      details: exceeded,
    };
  }

  private checkPiiProtection(input: any): boolean {
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/,
      /\b\d{13,19}\b/,
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    ];

    const text = JSON.stringify(input);
    
    for (const pattern of piiPatterns) {
      if (pattern.test(text)) {
        return false;
      }
    }

    return true;
  }

  private findViolations(checks: any): string[] {
    const violations = [];

    if (checks.otpRequired && !checks.otpProvided) {
      violations.push('OTP verification required');
    }

    if (checks.consentRequired && !checks.consentProvided) {
      violations.push('Customer consent required');
    }

    if (checks.limitsExceeded?.exceeded) {
      violations.push(`Limits exceeded: ${checks.limitsExceeded.details.join(', ')}`);
    }

    if (!checks.piiProtected) {
      violations.push('PII data must be protected');
    }

    return violations;
  }

  private getRecommendations(checks: any, violations: string[]): string[] {
    const recommendations = [];

    if (checks.otpRequired) {
      recommendations.push('Request OTP verification from customer');
    }

    if (checks.consentRequired) {
      recommendations.push('Obtain explicit customer consent');
    }

    if (checks.limitsExceeded?.exceeded) {
      recommendations.push('Request supervisor approval for limit override');
    }

    if (!checks.piiProtected) {
      recommendations.push('Redact PII before proceeding');
    }

    if (violations.length === 0) {
      recommendations.push('All compliance checks passed');
    }

    return recommendations;
  }
}