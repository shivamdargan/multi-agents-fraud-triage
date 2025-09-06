import { Module } from '@nestjs/common';
import { OrchestratorAgent } from './orchestrator/orchestrator.agent';
import { InsightsAgent } from './insights/insights.agent';
import { FraudAgent } from './fraud/fraud.agent';
import { KnowledgeBaseAgent } from './kb/kb.agent';
import { ComplianceAgent } from './compliance/compliance.agent';
import { RedactorAgent } from './redactor/redactor.agent';
import { SummarizerAgent } from './summarizer/summarizer.agent';
import { AgentRegistry } from './agent.registry';
import { AgentExecutor } from './agent.executor';

@Module({
  providers: [
    OrchestratorAgent,
    InsightsAgent,
    FraudAgent,
    KnowledgeBaseAgent,
    ComplianceAgent,
    RedactorAgent,
    SummarizerAgent,
    AgentRegistry,
    AgentExecutor,
  ],
  exports: [
    AgentExecutor,
    AgentRegistry,
  ],
})
export class AgentsModule {}