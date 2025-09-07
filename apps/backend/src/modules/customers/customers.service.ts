import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(params: {
    search?: string;
    riskLevel?: string;
    limit?: number;
    offset?: number;
  }) {
    const { search, riskLevel } = params;
    const limit = Number(params.limit) || 20;
    const offset = Number(params.offset) || 0;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { emailMasked: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (riskLevel) {
      where.riskLevel = riskLevel;
    }

    const customers = await this.prisma.customer.findMany({
      where,
      skip: offset,
      take: limit,
      include: {
        cards: true,
        _count: {
          select: { transactions: true },
        },
      },
    });

    return customers.map(customer => {
      // Determine risk level based on riskFlags
      const flags = customer.riskFlags as any;
      let riskLevel = 'LOW';
      if (flags?.previousFraud) {
        riskLevel = 'HIGH';
      } else if (flags?.highRiskCountry) {
        riskLevel = 'MEDIUM';
      }
      
      return {
        id: customer.id,
        name: customer.name,
        email: customer.emailMasked,
        phone: '',
        riskLevel: riskLevel,
        createdAt: customer.createdAt.toISOString(),
        lastActivity: customer.updatedAt.toISOString(),
        totalTransactions: customer._count.transactions,
        totalSpent: 0, // Calculate from transactions if needed
        cards: customer.cards,
      };
    });
  }

  async getById(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        cards: true,
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const totalSpent = await this.prisma.transaction.aggregate({
      where: { customerId: id },
      _sum: { amount: true },
    });

    // Determine risk level based on riskFlags
    const flags = customer.riskFlags as any;
    let riskLevel = 'LOW';
    if (flags?.previousFraud) {
      riskLevel = 'HIGH';
    } else if (flags?.highRiskCountry) {
      riskLevel = 'MEDIUM';
    }

    return {
      id: customer.id,
      name: customer.name,
      email: customer.emailMasked,
      phone: '',
      riskLevel: riskLevel,
      createdAt: customer.createdAt.toISOString(),
      lastActivity: customer.updatedAt.toISOString(),
      totalTransactions: customer._count.transactions,
      totalSpent: totalSpent._sum.amount?.toNumber() || 0,
      cards: customer.cards,
      transactions: customer.transactions,
    };
  }

  async getTransactions(
    customerId: string,
    params: {
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const { limit = 50, offset = 0, startDate, endDate } = params;

    const where: any = { customerId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    return this.prisma.transaction.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        card: {
          select: {
            last4: true,
            network: true,
          },
        },
      },
    });
  }

  async getInsights(customerId: string) {
    // Get spending by category (using mcc field)
    const categorySpending = await this.prisma.transaction.groupBy({
      by: ['mcc'],
      where: { customerId },
      _sum: { amount: true },
      _count: true,
    });

    // Get top merchants
    const topMerchants = await this.prisma.transaction.groupBy({
      by: ['merchant'],
      where: { customerId },
      _sum: { amount: true },
      _count: true,
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
      take: 10,
    });

    // Get spending trend (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailySpending = await this.prisma.transaction.groupBy({
      by: ['createdAt'],
      where: {
        customerId,
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
    });

    return {
      categoryBreakdown: categorySpending.map(cat => ({
        category: cat.mcc || 'Unknown',
        amount: cat._sum.amount?.toNumber() || 0,
        count: cat._count,
      })),
      topMerchants: topMerchants.map(merchant => ({
        name: merchant.merchant || 'Unknown',
        amount: merchant._sum.amount?.toNumber() || 0,
        count: merchant._count,
      })),
      spendingTrend: dailySpending.map(day => ({
        date: day.createdAt.toISOString().split('T')[0],
        amount: day._sum.amount?.toNumber() || 0,
      })),
    };
  }

  async updateRiskLevel(id: string, riskLevel: 'LOW' | 'MEDIUM' | 'HIGH') {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });
    
    const currentFlags = (customer?.riskFlags as any) || {};
    
    return this.prisma.customer.update({
      where: { id },
      data: { 
        riskFlags: {
          ...currentFlags,
          level: riskLevel,
          updatedAt: new Date().toISOString(),
        },
      },
    });
  }
}