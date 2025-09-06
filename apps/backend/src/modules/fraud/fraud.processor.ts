import { Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';
import { FraudService } from './fraud.service';

@Processor('fraud-detection')
@Injectable()
export class FraudProcessor {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private fraudService: FraudService,
  ) {}

  @Process('triage')
  async handleTriage(job: Job) {
    const { sessionId, customerId, transactionId } = job.data;
    
    try {
      this.fraudService.emitProgress(sessionId, {
        type: 'progress',
        message: 'Fetching customer profile',
        step: 1,
      });

      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          cards: true,
          transactions: {
            take: 50,
            orderBy: { timestamp: 'desc' },
          },
        },
      });

      this.fraudService.emitProgress(sessionId, {
        type: 'progress',
        message: 'Analyzing transaction patterns',
        step: 2,
      });

      const riskSignals = await this.fraudService.getRiskSignals(customerId);

      this.fraudService.emitProgress(sessionId, {
        type: 'progress',
        message: 'Evaluating risk factors',
        step: 3,
      });

      const decision = this.makeDecision(riskSignals.overallRisk);

      this.fraudService.emitProgress(sessionId, {
        type: 'progress',
        message: 'Generating recommendations',
        step: 4,
      });

      const result = {
        customerId,
        transactionId,
        riskScore: riskSignals.overallRisk,
        decision,
        signals: riskSignals.signals,
        recommendations: riskSignals.recommendations,
        timestamp: new Date().toISOString(),
      };

      if (riskSignals.overallRisk > 0.5) {
        await this.createAlert(customerId, riskSignals.overallRisk, result);
      }

      await this.saveTrace(sessionId, 'FraudAgent', 'triage', job.data, result);

      return result;
    } catch (error) {
      this.logger.error(`Triage failed for session ${sessionId}`, error.message);
      
      this.fraudService.emitProgress(sessionId, {
        type: 'error',
        message: 'Triage failed',
        error: error.message,
      });

      throw error;
    }
  }

  private makeDecision(riskScore: number): string {
    if (riskScore > 0.8) return 'BLOCK';
    if (riskScore > 0.6) return 'REVIEW';
    if (riskScore > 0.4) return 'MONITOR';
    return 'APPROVE';
  }

  private async createAlert(customerId: string, riskScore: number, metadata: any) {
    const severity = this.getSeverity(riskScore);
    
    await this.prisma.alert.create({
      data: {
        customerId,
        type: 'FRAUD',
        severity,
        riskScore,
        reasons: metadata.recommendations,
        status: 'PENDING',
        metadata,
      },
    });
  }

  private getSeverity(riskScore: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    if (riskScore > 0.8) return 'CRITICAL';
    if (riskScore > 0.6) return 'HIGH';
    if (riskScore > 0.4) return 'MEDIUM';
    return 'LOW';
  }

  private async saveTrace(sessionId: string, agentName: string, action: string, input: any, output: any) {
    await this.prisma.agentTrace.create({
      data: {
        sessionId,
        agentName,
        action,
        input,
        output,
        duration: Date.now(),
      },
    });
  }
}