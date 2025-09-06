import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentContext } from '../base.agent';
import { LoggerService } from '../../common/services/logger.service';
import { MetricsService } from '../../common/services/metrics.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class KnowledgeBaseAgent extends BaseAgent {
  protected name = 'kb';

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
    const { query, anchor } = input;
    
    if (anchor) {
      return this.lookupByAnchor(anchor);
    }
    
    if (query) {
      return this.searchKnowledge(query);
    }
    
    return this.getRelevantKnowledge(context);
  }

  private async lookupByAnchor(anchor: string): Promise<any> {
    const entry = await this.prisma.knowledgeBase.findUnique({
      where: { anchor },
    });

    if (!entry) {
      return {
        found: false,
        fallback: 'No specific guidance found. Follow standard procedures.',
      };
    }

    return {
      found: true,
      title: entry.title,
      content: entry.content,
      chunks: entry.chunks,
      citation: `[${entry.title}](${entry.anchor})`,
    };
  }

  private async searchKnowledge(query: string): Promise<any> {
    const results = await this.prisma.knowledgeBase.findMany({
      where: {
        OR: [
          { content: { contains: query, mode: 'insensitive' } },
          { title: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 3,
    });

    if (results.length === 0) {
      return {
        found: false,
        fallback: this.generateFallback(query),
      };
    }

    return {
      found: true,
      results: results.map((r: any) => ({
        title: r.title,
        snippet: this.extractSnippet(r.content, query),
        citation: `[${r.title}](${r.anchor})`,
      })),
    };
  }

  private async getRelevantKnowledge(context: AgentContext): Promise<any> {
    const topics = [];
    
    if (context.metadata?.riskScore > 0.7) {
      topics.push('fraud-detection');
    }
    
    if (context.metadata?.action === 'FREEZE_CARD') {
      topics.push('card-freeze');
    }
    
    if (topics.length === 0) {
      topics.push('customer-verification');
    }

    const entries = await this.prisma.knowledgeBase.findMany({
      where: {
        anchor: { in: topics },
      },
    });

    return {
      relevant: entries.map((e: any) => ({
        title: e.title,
        content: e.chunks[0],
        citation: `[${e.title}](${e.anchor})`,
      })),
    };
  }

  private extractSnippet(content: string, query: string): string {
    const index = content.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) {
      return content.slice(0, 150) + '...';
    }

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + query.length + 50);
    
    return (start > 0 ? '...' : '') + 
           content.slice(start, end) + 
           (end < content.length ? '...' : '');
  }

  private generateFallback(query: string): string {
    const fallbacks: Record<string, string> = {
      fraud: 'Follow standard fraud detection procedures. Escalate if risk score exceeds 0.7.',
      dispute: 'Process dispute according to standard timeline. Issue provisional credit if applicable.',
      freeze: 'Card freeze requires customer authentication. Notify customer immediately.',
    };

    for (const [key, value] of Object.entries(fallbacks)) {
      if (query.toLowerCase().includes(key)) {
        return value;
      }
    }

    return 'No specific guidance found. Follow standard operating procedures.';
  }
}