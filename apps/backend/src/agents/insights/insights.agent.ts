import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentContext } from '../base.agent';
import { LoggerService } from '../../common/services/logger.service';
import { MetricsService } from '../../common/services/metrics.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class InsightsAgent extends BaseAgent {
  protected name = 'insights';

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
    const { customerId } = context;
    
    if (!customerId) {
      throw new Error('Customer ID required for insights');
    }

    const transactions = await this.prisma.transaction.findMany({
      where: { customerId },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    const insights = {
      totalSpend: this.calculateTotalSpend(transactions),
      categories: this.categorizeSpending(transactions),
      merchants: this.topMerchants(transactions),
      summary: this.generateSummary(transactions),
    };

    return insights;
  }

  private calculateTotalSpend(transactions: any[]): number {
    return transactions.reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
  }

  private categorizeSpending(transactions: any[]): any {
    const categories: Record<string, number> = {};
    
    for (const tx of transactions) {
      const category = this.getMccCategory(tx.mcc);
      categories[category] = (categories[category] || 0) + Math.abs(Number(tx.amount));
    }
    
    return categories;
  }

  private topMerchants(transactions: any[]): any[] {
    const merchants: Record<string, number> = {};
    
    for (const tx of transactions) {
      merchants[tx.merchant] = (merchants[tx.merchant] || 0) + Math.abs(Number(tx.amount));
    }
    
    return Object.entries(merchants)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([merchant, amount]) => ({ merchant, amount }));
  }

  private generateSummary(transactions: any[]): string {
    const count = transactions.length;
    const total = this.calculateTotalSpend(transactions);
    const avg = count > 0 ? total / count : 0;
    
    const llmEnabled = (this.config as any).llmEnabled;
    if (llmEnabled) {
      return `Customer has ${count} transactions totaling $${total.toFixed(2)} with average $${avg.toFixed(2)}`;
    }
    
    return `${count} transactions, $${total.toFixed(2)} total, $${avg.toFixed(2)} average`;
  }

  private getMccCategory(mcc: string): string {
    const categories: Record<string, string> = {
      '5411': 'Grocery',
      '5541': 'Gas',
      '5812': 'Restaurant',
      '6011': 'ATM',
      '7995': 'Gambling',
    };
    return categories[mcc] || 'Other';
  }
}