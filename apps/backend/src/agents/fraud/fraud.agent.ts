import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentContext } from '../base.agent';
import { LoggerService } from '../../common/services/logger.service';
import { MetricsService } from '../../common/services/metrics.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FraudAgent extends BaseAgent {
  protected name = 'fraud';

  constructor(
    logger: LoggerService,
    metrics: MetricsService,
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super(logger, metrics, {
      maxRetries: configService.get('agents.maxRetries', 2),
      timeoutMs: configService.get('agents.timeoutMs', 1000),
      circuitBreakerThreshold: configService.get('agents.circuitBreakerThreshold', 3),
      circuitBreakerCooldownMs: configService.get('agents.circuitBreakerCooldownMs', 30000),
    });
  }

  protected async process(context: AgentContext, input: any): Promise<any> {
    const { customerId, transactionId } = context;
    
    const riskSignals = await this.analyzeRisk(customerId, transactionId);
    const score = this.calculateRiskScore(riskSignals);
    const decision = this.makeDecision(score);
    const reasons = this.generateReasons(riskSignals, score);
    
    return {
      score,
      decision,
      reasons,
      signals: riskSignals,
      action: this.recommendAction(score),
    };
  }

  private async analyzeRisk(customerId?: string, transactionId?: string): Promise<any> {
    const signals: any = {
      velocity: 0,
      deviceChange: 0,
      location: 0,
      merchant: 0,
      amount: 0,
    };

    if (customerId) {
      const recentTxns = await this.prisma.transaction.count({
        where: {
          customerId,
          timestamp: {
            gte: new Date(Date.now() - 3600000),
          },
        },
      });

      signals.velocity = Math.min(recentTxns * 0.1, 1);

      const devices = await this.prisma.device.count({
        where: {
          customerId,
          trusted: false,
        },
      });

      signals.deviceChange = Math.min(devices * 0.3, 1);
    }

    if (transactionId) {
      const tx = await this.prisma.transaction.findUnique({
        where: { id: transactionId },
      });

      if (tx) {
        signals.amount = Number(tx.amount) > 5000 ? 0.5 : 0;
        signals.merchant = ['6011', '7995'].includes(tx.mcc) ? 0.5 : 0;
      }
    }

    return signals;
  }

  private calculateRiskScore(signals: any): number {
    const weights = {
      velocity: 0.25,
      deviceChange: 0.25,
      location: 0.15,
      merchant: 0.2,
      amount: 0.15,
    };

    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      score += (signals[key] || 0) * weight;
    }

    return Math.min(score, 1);
  }

  private makeDecision(score: number): string {
    if (score > 0.8) return 'BLOCK';
    if (score > 0.6) return 'REVIEW';
    if (score > 0.4) return 'MONITOR';
    return 'APPROVE';
  }

  private generateReasons(signals: any, score: number): string[] {
    const reasons = [];
    
    if (signals.velocity > 0.5) {
      reasons.push('High transaction velocity detected');
    }
    if (signals.deviceChange > 0.3) {
      reasons.push('Transaction from untrusted device');
    }
    if (signals.amount > 0.3) {
      reasons.push('Unusually high transaction amount');
    }
    if (signals.merchant > 0.3) {
      reasons.push('High-risk merchant category');
    }
    if (score > 0.7) {
      reasons.push('Overall risk score exceeds threshold');
    }
    
    return reasons;
  }

  private recommendAction(score: number): string | null {
    if (score > 0.8) return 'FREEZE_CARD';
    if (score > 0.6) return 'CONTACT_CUSTOMER';
    return null;
  }
}