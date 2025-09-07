import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get total transactions
    const totalTransactions = await this.prisma.transaction.count({
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
      },
    });

    // Get all alerts and filter by transaction dates
    const allAlerts = await this.prisma.alert.findMany({
      include: {
        customer: true,
      },
    });

    // Filter alerts based on transaction timestamp in metadata
    const alertsInRange = allAlerts.filter(alert => {
      const txTimestamp = (alert.metadata as any)?.timestamp;
      if (!txTimestamp) return false;
      const txDate = new Date(txTimestamp);
      return txDate >= start && txDate <= end;
    });

    const totalAlerts = alertsInRange.length;
    const activeAlerts = alertsInRange.filter(a => a.status === 'PENDING').length;

    // Calculate fraud rate (based on high risk score)
    const fraudulentTransactions = await this.prisma.transaction.count({
      where: {
        riskScore: {
          gte: 0.7,
        },
        timestamp: {
          gte: start,
          lte: end,
        },
      },
    });
    
    const fraudRate = totalTransactions > 0 ? (fraudulentTransactions / totalTransactions) : 0;

    // Get recent alerts for transactions in the date range
    const recentAlerts = alertsInRange
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    // Get disputes count
    const totalDisputes = await this.prisma.chargeback.count({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const openDisputes = await this.prisma.chargeback.count({
      where: {
        status: { in: ['OPEN', 'INVESTIGATING'] },
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    // Calculate average response time (mock for now)
    const avgResponseTime = 145; // seconds

    // Calculate false positive rate (mock for now)
    const falsePositiveRate = 0.12;

    return {
      totalTransactions,
      totalAlerts,
      activeAlerts,
      fraudRate,
      avgResponseTime,
      falsePositiveRate,
      totalDisputes,
      openDisputes,
      recentAlerts: recentAlerts.map(alert => ({
        id: alert.id,
        customerId: alert.customerId,
        customerName: alert.customer?.name || 'Unknown',
        type: alert.type,
        severity: alert.severity,
        status: alert.status,
        riskScore: alert.riskScore,
        reasons: alert.reasons,
        amount: (alert.metadata as any)?.amount || 0,
        timestamp: alert.createdAt.toISOString(),
        description: Array.isArray(alert.reasons) ? alert.reasons.join(', ') : 'No description',
        metadata: alert.metadata,
        customer: alert.customer ? { name: alert.customer.name } : undefined,
      })),
    };
  }
}