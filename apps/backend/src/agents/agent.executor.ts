import { Injectable } from '@nestjs/common';
import { AgentRegistry } from './agent.registry';
import { AgentContext, AgentResult } from './base.agent';
import { PrismaService } from '../database/prisma.service';
import { LoggerService } from '../common/services/logger.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AgentExecutor {
  private flowBudgetMs: number;

  constructor(
    private registry: AgentRegistry,
    private prisma: PrismaService,
    private logger: LoggerService,
    private configService: ConfigService,
  ) {
    this.flowBudgetMs = this.configService.get('agents.flowBudgetMs', 5000);
  }

  async executeFlow(context: AgentContext, plan: string[]): Promise<any> {
    const startTime = Date.now();
    const results: Record<string, AgentResult> = {};
    
    this.logger.log(`Starting agent flow for session ${context.sessionId}`);

    for (const step of plan) {
      if (Date.now() - startTime > this.flowBudgetMs) {
        this.logger.warn('Flow budget exceeded');
        break;
      }

      const [agentName, ...params] = step.split(':');
      const agent = this.registry.get(agentName);

      if (!agent) {
        this.logger.warn(`Agent ${agentName} not found`);
        continue;
      }

      const input = this.prepareInput(params.join(':'), results);
      const result = await agent.execute(context, input);
      
      results[agentName] = result;

      await this.saveTrace(context.sessionId, agentName, step, input, result);

      if (!result.success && this.isCriticalStep(agentName)) {
        this.logger.error(`Critical step ${agentName} failed`);
        break;
      }
    }

    const duration = Date.now() - startTime;
    this.logger.log(`Agent flow completed in ${duration}ms`);

    return {
      sessionId: context.sessionId,
      results,
      duration,
      completed: Object.keys(results).length === plan.length,
    };
  }

  async executeAgent(
    agentName: string,
    context: AgentContext,
    input: any,
  ): Promise<AgentResult> {
    const agent = this.registry.get(agentName);
    
    if (!agent) {
      return {
        success: false,
        error: `Agent ${agentName} not found`,
      };
    }

    const result = await agent.execute(context, input);
    await this.saveTrace(context.sessionId, agentName, 'execute', input, result);
    
    return result;
  }

  private prepareInput(params: string, previousResults: Record<string, AgentResult>): any {
    if (!params) return previousResults;
    
    try {
      return JSON.parse(params);
    } catch {
      return { params, previousResults };
    }
  }

  private isCriticalStep(agentName: string): boolean {
    const criticalAgents = ['fraud', 'compliance'];
    return criticalAgents.includes(agentName);
  }

  private async saveTrace(
    sessionId: string,
    agentName: string,
    action: string,
    input: any,
    result: AgentResult,
  ) {
    try {
      await this.prisma.agentTrace.create({
        data: {
          sessionId,
          agentName,
          action,
          input,
          output: result.data,
          error: result.error,
          duration: result.duration,
        },
      });
    } catch (error) {
      this.logger.error('Failed to save agent trace', error.message);
    }
  }
}