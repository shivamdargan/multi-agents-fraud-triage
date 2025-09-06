import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { OrchestratorAgent } from './orchestrator/orchestrator.agent';
import { InsightsAgent } from './insights/insights.agent';
import { FraudAgent } from './fraud/fraud.agent';
import { KnowledgeBaseAgent } from './kb/kb.agent';
import { ComplianceAgent } from './compliance/compliance.agent';
import { RedactorAgent } from './redactor/redactor.agent';
import { SummarizerAgent } from './summarizer/summarizer.agent';

@Injectable()
export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();

  constructor(
    orchestrator: OrchestratorAgent,
    insights: InsightsAgent,
    fraud: FraudAgent,
    kb: KnowledgeBaseAgent,
    compliance: ComplianceAgent,
    redactor: RedactorAgent,
    summarizer: SummarizerAgent,
  ) {
    this.register('orchestrator', orchestrator);
    this.register('insights', insights);
    this.register('fraud', fraud);
    this.register('kb', kb);
    this.register('compliance', compliance);
    this.register('redactor', redactor);
    this.register('summarizer', summarizer);
  }

  register(name: string, agent: BaseAgent) {
    this.agents.set(name, agent);
  }

  get(name: string): BaseAgent | undefined {
    return this.agents.get(name);
  }

  getAll(): Map<string, BaseAgent> {
    return this.agents;
  }
}