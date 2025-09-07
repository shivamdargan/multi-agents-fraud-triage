import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';
import { MetricsService } from '../../common/services/metrics.service';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class InsightsService {
  private recentReportRequests = new Map<string, number>();

  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private metrics: MetricsService,
  ) {}

  async getSpendInsights(customerId: string, period: string = '30d') {
    const startDate = this.getStartDateFromPeriod(period);
    
    const transactions = await this.prisma.transaction.findMany({
      where: {
        customerId,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'desc' },
    });

    const summary = this.calculateSummary(transactions);
    const trends = await this.calculateTrends(customerId, startDate);
    const categories = await this.getCategoryBreakdown(customerId, startDate);
    const topMerchants = await this.getTopMerchants(customerId, 5, startDate);
    const anomalies = this.detectAnomalies(transactions);

    return {
      customerId,
      period,
      summary,
      trends,
      categories,
      topMerchants,
      anomalies,
    };
  }

  async getCategoryBreakdown(customerId: string, startDate?: Date) {
    const where: any = {
      customerId,
      ...(startDate && { timestamp: { gte: startDate } }),
    };

    const breakdown = await this.prisma.transaction.groupBy({
      by: ['mcc'],
      where,
      _sum: { amount: true },
      _count: true,
    });

    const total = breakdown.reduce((sum: number, cat: any) => sum + Math.abs(Number(cat._sum.amount || 0)), 0);

    return {
      categories: breakdown.map((cat: any) => ({
        mcc: cat.mcc,
        category: this.getMccCategory(cat.mcc),
        total: Math.abs(Number(cat._sum.amount || 0)),
        count: cat._count,
        percentage: total > 0 ? (Math.abs(Number(cat._sum.amount || 0)) / total) * 100 : 0,
      })).sort((a: any, b: any) => b.total - a.total),
    };
  }

  async getTopMerchants(customerId: string, limit: number = 10, startDate?: Date) {
    const where: any = {
      customerId,
      ...(startDate && { timestamp: { gte: startDate } }),
    };

    const merchants = await this.prisma.transaction.groupBy({
      by: ['merchant'],
      where,
      _sum: { amount: true },
      _count: true,
      _max: { timestamp: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });

    return {
      merchants: merchants.map((m: any) => ({
        merchant: m.merchant,
        total: Math.abs(Number(m._sum.amount || 0)),
        count: m._count,
        lastTransaction: m._max.timestamp?.toISOString() || '',
      })),
    };
  }

  async getTimeSeriesData(customerId: string, metric: string, period: string) {
    const startDate = this.getStartDateFromPeriod(period);
    
    const transactions = await this.prisma.transaction.findMany({
      where: {
        customerId,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'asc' },
    });

    const data = this.aggregateByDay(transactions, metric);

    return { data };
  }

  async generateReport(customerId: string, type: string) {
    // Check for duplicate request within 2 seconds
    const requestKey = `${customerId}-${type}`;
    const lastRequestTime = this.recentReportRequests.get(requestKey);
    const now = Date.now();
    
    if (lastRequestTime && (now - lastRequestTime) < 2000) {
      this.logger.warn(`Duplicate report request blocked for ${requestKey}`);
      // Return a mock response instead of generating duplicate
      return {
        id: 'duplicate-blocked',
        customerId,
        type,
        status: 'DUPLICATE_BLOCKED',
        message: 'Duplicate request blocked',
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }
    
    this.recentReportRequests.set(requestKey, now);
    // Clean up old entries after 5 seconds
    setTimeout(() => {
      this.recentReportRequests.delete(requestKey);
    }, 5000);

    const reportId = uuidv4();
    const startTime = Date.now();

    try {
      const reportData = await this.collectReportData(customerId, type);
      
      const report = {
        id: reportId,
        customerId,
        type,
        status: 'COMPLETED',
        content: reportData,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const reportsPath = process.env.REPORTS_PATH || './storage/reports';
      await fs.mkdir(reportsPath, { recursive: true });
      await fs.writeFile(
        path.join(reportsPath, `${reportId}.json`),
        JSON.stringify(report, null, 2),
      );

      this.metrics.recordCounter('insights.reports.generated');
      this.metrics.recordLatency('insights.report.generation', startTime);

      return report;
    } catch (error) {
      this.logger.error(`Failed to generate report for ${customerId}`, error.message);
      throw error;
    }
  }

  async getReports(customerId?: string) {
    const reportsPath = process.env.REPORTS_PATH || './storage/reports';
    
    try {
      const files = await fs.readdir(reportsPath);
      const reports = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(reportsPath, file), 'utf-8');
          const report = JSON.parse(content);
          
          if (!customerId || report.customerId === customerId) {
            reports.push(report);
          }
        }
      }

      return reports.sort((a, b) => 
        new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
      );
    } catch (error) {
      return [];
    }
  }

  private getStartDateFromPeriod(period: string): Date {
    const now = new Date();
    const match = period.match(/(\d+)([dwmy])/);
    
    if (!match) return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const [, num, unit] = match;
    const value = parseInt(num);
    
    switch (unit) {
      case 'd':
        return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
      case 'w':
        return new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
      case 'm':
        return new Date(now.getTime() - value * 30 * 24 * 60 * 60 * 1000);
      case 'y':
        return new Date(now.getTime() - value * 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private calculateSummary(transactions: any[]) {
    const amounts = transactions.map(t => Math.abs(Number(t.amount)));
    const total = amounts.reduce((sum, a) => sum + a, 0);
    const uniqueMerchants = new Set(transactions.map(t => t.merchant)).size;

    return {
      totalSpend: total,
      averageTransaction: amounts.length > 0 ? total / amounts.length : 0,
      transactionCount: transactions.length,
      uniqueMerchants,
    };
  }

  async getCustomerSummary(customerId: string) {
    const [topMerchants, categories, monthlyTrend] = await Promise.all([
      this.getTopMerchants(customerId, 5),
      this.getCategoryBreakdown(customerId),
      this.getMonthlyTrend(customerId),
    ]);

    return {
      topMerchants: topMerchants.merchants || [],
      categories: categories.categories || [],
      monthlyTrend: monthlyTrend || [],
    };
  }

  private async getMonthlyTrend(customerId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        customerId,
        timestamp: { gte: sixMonthsAgo },
      },
      orderBy: { timestamp: 'asc' },
    });

    const monthlyData = new Map();
    
    transactions.forEach(tx => {
      const month = tx.timestamp.toISOString().slice(0, 7); // YYYY-MM
      const current = monthlyData.get(month) || { month, amount: 0, count: 0 };
      current.amount += Math.abs(Number(tx.amount));
      current.count += 1;
      monthlyData.set(month, current);
    });

    return Array.from(monthlyData.values());
  }

  private async calculateTrends(customerId: string, startDate: Date) {
    const previousPeriodStart = new Date(
      startDate.getTime() - (Date.now() - startDate.getTime())
    );

    const [currentPeriod, previousPeriod] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          customerId,
          timestamp: { gte: startDate },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          customerId,
          timestamp: {
            gte: previousPeriodStart,
            lt: startDate,
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const current = Math.abs(Number(currentPeriod._sum.amount || 0));
    const previous = Math.abs(Number(previousPeriod._sum.amount || 0));
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    let percentageChange = 0;

    if (previous > 0) {
      percentageChange = ((current - previous) / previous) * 100;
      if (percentageChange > 5) trend = 'increasing';
      else if (percentageChange < -5) trend = 'decreasing';
    }

    return {
      spendTrend: trend,
      percentageChange,
      comparisonPeriod: `${previousPeriodStart.toISOString().split('T')[0]} to ${startDate.toISOString().split('T')[0]}`,
    };
  }

  private detectAnomalies(transactions: any[]) {
    const anomalies = [];
    
    const amounts = transactions.map(t => Math.abs(Number(t.amount)));
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / amounts.length
    );

    for (const tx of transactions) {
      const amount = Math.abs(Number(tx.amount));
      if (amount > avg + 2 * stdDev) {
        anomalies.push({
          type: 'HIGH_AMOUNT',
          description: `Transaction of ${amount} is significantly higher than average`,
          severity: amount > avg + 3 * stdDev ? 'high' : 'medium',
        });
      }
    }

    return anomalies.slice(0, 5);
  }

  private getMccCategory(mcc: string): string {
    const categories: Record<string, string> = {
      '5411': 'Grocery',
      '5541': 'Gas Station',
      '5812': 'Restaurant',
      '5999': 'Miscellaneous',
      '6011': 'ATM',
      '7995': 'Gambling',
      '5816': 'Digital Goods',
    };
    
    return categories[mcc] || 'Other';
  }

  private aggregateByDay(transactions: any[], metric: string) {
    const dayMap = new Map<string, number>();

    for (const tx of transactions) {
      const date = new Date(tx.timestamp).toISOString().split('T')[0];
      const current = dayMap.get(date) || 0;
      
      if (metric === 'amount') {
        dayMap.set(date, current + Math.abs(Number(tx.amount)));
      } else if (metric === 'count') {
        dayMap.set(date, current + 1);
      }
    }

    return Array.from(dayMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async collectReportData(customerId: string, type: string) {
    const [insights, riskSignals, recentTransactions] = await Promise.all([
      this.getSpendInsights(customerId, '30d'),
      this.prisma.alert.findMany({
        where: { customerId },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.findMany({
        where: { customerId },
        take: 50,
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    return {
      type,
      generatedAt: new Date().toISOString(),
      insights,
      riskSignals,
      recentTransactions,
    };
  }
}