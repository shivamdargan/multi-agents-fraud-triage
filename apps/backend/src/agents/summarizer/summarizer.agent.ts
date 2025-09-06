import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentContext } from '../base.agent';
import { LoggerService } from '../../common/services/logger.service';
import { MetricsService } from '../../common/services/metrics.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SummarizerAgent extends BaseAgent {
  protected name = 'summarizer';
  private llmEnabled: boolean;

  constructor(
    logger: LoggerService,
    metrics: MetricsService,
    private configService: ConfigService,
  ) {
    super(logger, metrics, {
      maxRetries: configService.get('agents.maxRetries', 2),
      timeoutMs: configService.get('agents.timeoutMs', 1000),
      circuitBreakerThreshold: configService.get('agents.circuitBreakerThreshold', 3),
      circuitBreakerCooldownMs: configService.get('agents.circuitBreakerCooldownMs', 30000),
    });
    this.llmEnabled = configService.get('llm.enabled', false);
  }

  protected async process(context: AgentContext, input: any): Promise<any> {
    const { type, data } = input;
    
    let summary: string;
    let internalNotes: string;
    
    if (this.llmEnabled) {
      summary = await this.generateLlmSummary(type, data);
      internalNotes = await this.generateLlmNotes(type, data);
    } else {
      summary = this.generateTemplateSummary(type, data);
      internalNotes = this.generateTemplateNotes(type, data);
    }

    return {
      customerSummary: summary,
      internalNotes,
      metadata: {
        type,
        timestamp: new Date().toISOString(),
        sessionId: context.sessionId,
      },
    };
  }

  private async generateLlmSummary(type: string, data: any): Promise<string> {
    return this.generateTemplateSummary(type, data);
  }

  private async generateLlmNotes(type: string, data: any): Promise<string> {
    return this.generateTemplateNotes(type, data);
  }

  private generateTemplateSummary(type: string, data: any): string {
    const templates: Record<string, (data: any) => string> = {
      fraud_alert: (d) => 
        `We detected unusual activity on your account. Risk level: ${d.riskLevel || 'Medium'}. ` +
        `Action taken: ${d.action || 'Under review'}. Please contact us if you have questions.`,
      
      transaction_review: (d) =>
        `Transaction of ${d.amount || 'N/A'} at ${d.merchant || 'merchant'} is being reviewed. ` +
        `We'll notify you once the review is complete.`,
      
      card_frozen: (d) =>
        `Your card ending in ${d.last4 || 'XXXX'} has been temporarily frozen for security. ` +
        `Please contact support to unfreeze.`,
      
      dispute_created: (d) =>
        `Dispute #${d.disputeId || 'XXXXX'} has been created for ${d.amount || 'the transaction'}. ` +
        `We'll investigate and update you within 2 business days.`,
      
      compliance_block: (d) =>
        `This action requires additional verification. ${d.reason || 'Please complete verification steps.'}`,
      
      default: (d) =>
        `Your request has been processed. Reference: ${d.sessionId || 'N/A'}`,
    };

    const template = templates[type] || templates.default;
    return template(data);
  }

  private generateTemplateNotes(type: string, data: any): string {
    const notes = [];
    
    notes.push(`Type: ${type}`);
    notes.push(`Timestamp: ${new Date().toISOString()}`);
    
    if (data.riskScore !== undefined) {
      notes.push(`Risk Score: ${data.riskScore}`);
    }
    
    if (data.decision) {
      notes.push(`Decision: ${data.decision}`);
    }
    
    if (data.reasons && Array.isArray(data.reasons)) {
      notes.push(`Reasons: ${data.reasons.join(', ')}`);
    }
    
    if (data.action) {
      notes.push(`Action: ${data.action}`);
    }
    
    if (data.customerId) {
      notes.push(`Customer: ${data.customerId}`);
    }
    
    if (data.agentResults) {
      const agents = Object.keys(data.agentResults).join(', ');
      notes.push(`Agents involved: ${agents}`);
    }
    
    if (data.violations && data.violations.length > 0) {
      notes.push(`Compliance violations: ${data.violations.join(', ')}`);
    }
    
    return notes.join('\n');
  }
}