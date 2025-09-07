import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Observable, Subject } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';
import { MetricsService } from '../../common/services/metrics.service';
import { RedisService } from '../../common/services/redis.service';
import { TriageRequestDto, AlertQueryDto, UpdateAlertDto, AlertStatus, AlertType, AlertSeverity } from './dto';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FraudService {
  private triageStreams = new Map<string, Subject<any>>();

  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private metrics: MetricsService,
    private redis: RedisService,
    @InjectQueue('fraud-detection') private fraudQueue: Queue,
  ) {}

  async runTriage(dto: TriageRequestDto) {
    const sessionId = uuidv4();
    const startTime = Date.now();

    const stream = new Subject<any>();
    this.triageStreams.set(sessionId, stream);

    const job = await this.fraudQueue.add('triage', {
      sessionId,
      ...dto,
    });

    this.emitProgress(sessionId, {
      type: 'start',
      message: 'Starting fraud triage',
      sessionId,
    });

    const result = await job.finished();

    this.emitProgress(sessionId, {
      type: 'complete',
      message: 'Triage completed',
      result,
      duration: Date.now() - startTime,
    });

    setTimeout(() => {
      stream.complete();
      this.triageStreams.delete(sessionId);
    }, 5000);

    this.metrics.recordLatency('fraud.triage', startTime);
    this.metrics.recordCounter('fraud.triage.completed');

    return {
      sessionId,
      result,
      duration: Date.now() - startTime,
    };
  }

  streamTriageProgress(sessionId: string): Observable<any> {
    const stream = this.triageStreams.get(sessionId);
    
    if (!stream) {
      const newStream = new Subject<any>();
      newStream.next({ data: { type: 'error', message: 'Session not found' } });
      newStream.complete();
      return newStream.asObservable();
    }

    return stream.asObservable();
  }

  emitProgress(sessionId: string, data: any) {
    const stream = this.triageStreams.get(sessionId);
    if (stream) {
      stream.next({ data });
    }
  }

  async getAlerts(query: AlertQueryDto) {
    const where: any = {};
    
    if (query.customerId) where.customerId = query.customerId;
    if (query.type) where.type = query.type;
    if (query.severity) where.severity = query.severity;
    if (query.status) where.status = query.status;
    
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [alerts, total, actionStats] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        include: {
          customer: true,
        },
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: query.skip || 0,
        take: query.take || 50,
      }),
      this.prisma.alert.count({ where }),
      this.getActionStatistics(),
    ]);

    return {
      alerts,
      pagination: {
        total,
        skip: query.skip || 0,
        take: query.take || 50,
      },
      actionStats,
    };
  }

  async getAlert(id: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            cards: true,
            transactions: {
              take: 10,
              orderBy: { timestamp: 'desc' },
            },
          },
        },
      },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    return alert;
  }

  async updateAlert(id: string, dto: UpdateAlertDto) {
    try {
      const alert = await this.prisma.alert.update({
        where: { id },
        data: {
          status: dto.status,
          triageData: dto.triageData,
          resolvedAt: dto.status === AlertStatus.RESOLVED || dto.status === AlertStatus.FALSE_POSITIVE 
            ? new Date() 
            : undefined,
        },
      });

      this.metrics.recordCounter('fraud.alerts.updated', 1, { status: dto.status });

      return alert;
    } catch (error: any) {
      if (error.code === 'P2025') {
        // Record not found
        throw new NotFoundException(`Alert with ID ${id} not found`);
      }
      throw error;
    }
  }

  async getRiskSignals(customerId: string) {
    const [
      customer,
      recentTransactions,
      devices,
      chargebacks,
      alerts,
    ] = await Promise.all([
      this.prisma.customer.findUnique({
        where: { id: customerId },
      }),
      this.prisma.transaction.findMany({
        where: {
          customerId,
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.device.findMany({
        where: { customerId },
      }),
      this.prisma.chargeback.count({
        where: { customerId },
      }),
      this.prisma.alert.count({
        where: {
          customerId,
          status: { not: AlertStatus.FALSE_POSITIVE },
        },
      }),
    ]);

    // Base risk score from customer flags - aligned with frontend thresholds
    const flags = customer?.riskFlags as any;
    let baseRiskScore = 0;
    if (flags?.previousFraud) {
      baseRiskScore = 0.75; // HIGH risk base (>= 0.7)
    } else if (flags?.highRiskCountry) {
      baseRiskScore = 0.45; // MEDIUM risk base (>= 0.4)
    } else {
      baseRiskScore = 0.1; // LOW risk base (< 0.4)
    }

    const velocityScore = this.calculateVelocityScore(recentTransactions);
    const deviceScore = this.calculateDeviceScore(devices);
    const historyScore = this.calculateHistoryScore(chargebacks, alerts);

    // Combine base risk with calculated scores (weighted average)
    // Give more weight to base risk to ensure consistency with list view
    const overallRisk = (baseRiskScore * 0.7) + ((velocityScore + deviceScore + historyScore) / 3 * 0.3);

    return {
      overallRisk,
      signals: {
        velocity: {
          score: velocityScore,
          transactionCount: recentTransactions.length,
          totalAmount: recentTransactions.reduce((sum: number, tx: any) => sum + parseFloat(tx.amount.toString()), 0),
        },
        devices: {
          score: deviceScore,
          totalDevices: devices.length,
          untrustedDevices: devices.filter((d: any) => !d.trusted).length,
        },
        history: {
          score: historyScore,
          chargebackCount: chargebacks,
          alertCount: alerts,
        },
      },
      recommendations: this.generateRecommendations(overallRisk, flags),
    };
  }

  async getFraudQueue(status?: string) {
    const where: any = {
      ...(status && { status: status as AlertStatus }),
    };

    const alerts = await this.prisma.alert.findMany({
      where,
      include: {
        customer: true,
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'asc' },
      ],
      take: 100,
    });

    const stats = await this.prisma.alert.groupBy({
      by: ['status'],
      _count: true,
    });

    return {
      queue: alerts,
      stats: stats.reduce((acc: any, stat: any) => {
        acc[stat.status] = stat._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  async freezeCard(cardId: string) {
    const card = await this.prisma.card.update({
      where: { id: cardId },
      data: { status: 'FROZEN' },
    });

    this.logger.log(`Card ${cardId} frozen`, 'FraudService');
    this.metrics.recordCounter('fraud.cards.frozen');

    return {
      success: true,
      card,
      message: 'Card has been frozen successfully',
    };
  }

  async createDispute(transactionId: string, body: any) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const dispute = await this.prisma.chargeback.create({
      data: {
        customerId: transaction.customerId,
        transactionId,
        amount: transaction.amount,
        reason: body.reason || 'Fraudulent transaction',
        status: 'OPEN',
      },
    });

    this.logger.log(`Dispute created for transaction ${transactionId}`, 'FraudService');
    this.metrics.recordCounter('fraud.disputes.created');

    return dispute;
  }

  private calculateVelocityScore(transactions: any[]): number {
    if (transactions.length === 0) return 0;
    
    const hourlyVelocity = transactions.filter(tx => 
      new Date(tx.timestamp).getTime() > Date.now() - 3600000
    ).length;
    
    if (hourlyVelocity > 10) return 1;
    if (hourlyVelocity > 5) return 0.7;
    if (hourlyVelocity > 3) return 0.4;
    
    return 0.2;
  }

  private calculateDeviceScore(devices: any[]): number {
    if (devices.length === 0) return 0.5;
    
    const untrustedRatio = devices.filter(d => !d.trusted).length / devices.length;
    
    return Math.min(untrustedRatio * 1.5, 1);
  }

  private calculateHistoryScore(chargebacks: number, alerts: number): number {
    const score = (chargebacks * 0.3 + alerts * 0.1);
    return Math.min(score, 1);
  }

  private generateRecommendations(riskScore: number, flags?: any): string[] {
    const recommendations = [];
    
    // Add specific recommendations based on flags
    if (flags?.previousFraud) {
      recommendations.push('⚠️ Customer has previous fraud history - heightened vigilance required');
    }
    if (flags?.highRiskCountry) {
      recommendations.push('🌍 Customer in high-risk country - verify all cross-border transactions');
    }
    if (flags?.vipCustomer) {
      recommendations.push('⭐ VIP customer - expedite resolution and provide premium support');
    }
    
    // Add score-based recommendations
    if (riskScore >= 0.7) {
      recommendations.push('🔴 Immediate card freeze recommended - high risk detected');
      recommendations.push('📞 Contact customer immediately via registered phone number');
      recommendations.push('🔍 Review all recent transactions for potential fraud patterns');
    } else if (riskScore >= 0.4) {
      recommendations.push('🟡 Enhanced monitoring required for next 30 days');
      recommendations.push('🔐 Request additional authentication for high-value transactions');
      recommendations.push('📊 Review spending patterns for anomalies');
    } else {
      recommendations.push('✅ No immediate action required - low risk profile');
      recommendations.push('📈 Continue standard monitoring procedures');
    }
    
    return recommendations;
  }

  private async getActionStatistics() {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalDisputes,
      recentDisputes,
      frozenCards,
      totalFrozenCards,
      resolvedToday,
      avgResolutionTime,
    ] = await Promise.all([
      // Total disputes
      this.prisma.chargeback.count(),
      // Disputes in last 24 hours
      this.prisma.chargeback.count({
        where: {
          createdAt: { gte: last24Hours },
        },
      }),
      // Cards frozen in last 24 hours
      this.prisma.card.count({
        where: {
          status: 'FROZEN',
          updatedAt: { gte: last24Hours },
        },
      }),
      // Total frozen cards
      this.prisma.card.count({
        where: { status: 'FROZEN' },
      }),
      // Alerts resolved today
      this.prisma.alert.count({
        where: {
          status: { in: [AlertStatus.RESOLVED, AlertStatus.FALSE_POSITIVE] },
          resolvedAt: { gte: last24Hours },
        },
      }),
      // Average resolution time
      this.prisma.$queryRaw<{ avgTime: number }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as "avgTime"
        FROM alerts
        WHERE resolved_at IS NOT NULL
        AND created_at >= ${last7Days}
      `.then(result => result[0]?.avgTime || 0),
    ]);

    return {
      disputes: {
        total: totalDisputes,
        recent: recentDisputes,
      },
      cardActions: {
        frozenToday: frozenCards,
        totalFrozen: totalFrozenCards,
      },
      resolutions: {
        today: resolvedToday,
        avgTimeHours: Math.round((avgResolutionTime / 3600) * 10) / 10, // Convert to hours with 1 decimal
      },
    };
  }
}