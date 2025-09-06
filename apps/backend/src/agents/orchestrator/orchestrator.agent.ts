import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentContext } from '../base.agent';
import { LoggerService } from '../../common/services/logger.service';
import { MetricsService } from '../../common/services/metrics.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrchestratorAgent extends BaseAgent {
  protected name = 'orchestrator';

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
    const plan = this.createPlan(input);
    
    this.logger.log(`Orchestrator created plan: ${JSON.stringify(plan)}`);
    
    return {
      plan,
      context,
      estimatedDuration: plan.length * 500,
    };
  }

  private createPlan(input: any): string[] {
    const plan = [];
    
    if (input.requiresProfile) {
      plan.push('getProfile');
    }
    
    if (input.requiresTransactions) {
      plan.push('getRecentTransactions');
    }
    
    if (input.requiresRiskAnalysis) {
      plan.push('riskSignals');
    }
    
    if (input.requiresKnowledge) {
      plan.push('kbLookup');
    }
    
    if (input.requiresCompliance) {
      plan.push('complianceCheck');
    }
    
    plan.push('decide');
    
    if (input.requiresAction) {
      plan.push('proposeAction');
    }
    
    return plan;
  }
}