import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';
import { MetricsService } from '../../common/services/metrics.service';
import { RedisService } from '../../common/services/redis.service';
import { CreateTransactionDto, TransactionQueryDto, UploadTransactionsDto } from './dto';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private metrics: MetricsService,
    private redis: RedisService,
  ) {}

  async uploadTransactions(dto: UploadTransactionsDto) {
    const startTime = Date.now();
    
    try {
      const transactions = dto.transactions.map(tx => ({
        ...tx,
        amount: new Decimal(tx.amount),
        timestamp: new Date(tx.timestamp),
      }));

      const result = await this.prisma.$transaction(async (prisma: any) => {
        const created = [];
        
        for (const tx of transactions) {
          const existing = await prisma.transaction.findFirst({
            where: {
              customerId: tx.customerId,
              cardId: tx.cardId,
              timestamp: tx.timestamp,
              amount: tx.amount,
            },
          });

          if (!existing) {
            const transaction = await prisma.transaction.create({
              data: tx,
            });
            created.push(transaction);
          }
        }
        
        return created;
      });

      this.metrics.recordCounter('transactions.uploaded', result.length);
      this.metrics.recordLatency('transactions.upload', startTime);

      return {
        uploaded: result.length,
        duplicates: dto.transactions.length - result.length,
        transactions: result,
      };
    } catch (error) {
      this.logger.error('Failed to upload transactions', error.message);
      throw new BadRequestException('Failed to upload transactions');
    }
  }

  async createTransaction(dto: CreateTransactionDto) {
    try {
      const transaction = await this.prisma.transaction.create({
        data: {
          ...dto,
          amount: new Decimal(dto.amount),
          timestamp: new Date(dto.timestamp),
        },
        include: {
          customer: true,
          card: true,
        },
      });

      await this.invalidateCache(`transactions:${dto.customerId}`);
      
      this.metrics.recordCounter('transactions.created');
      
      return transaction;
    } catch (error) {
      this.logger.error('Failed to create transaction', error.message);
      throw new BadRequestException('Failed to create transaction');
    }
  }

  async getTransactions(query: TransactionQueryDto) {
    const cacheKey = `transactions:${JSON.stringify(query)}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const where: any = {};
    
    if (query.customerId) where.customerId = query.customerId;
    if (query.cardId) where.cardId = query.cardId;
    if (query.mcc) where.mcc = query.mcc;
    if (query.merchant) where.merchant = { contains: query.merchant, mode: 'insensitive' };
    if (query.status) where.status = query.status;
    
    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = new Date(query.startDate);
      if (query.endDate) where.timestamp.lte = new Date(query.endDate);
    }
    
    if (query.minAmount || query.maxAmount) {
      where.amount = {};
      if (query.minAmount) where.amount.gte = new Decimal(query.minAmount);
      if (query.maxAmount) where.amount.lte = new Decimal(query.maxAmount);
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          customer: true,
          card: true,
        },
        orderBy: { timestamp: 'desc' },
        skip: query.skip || 0,
        take: query.take || 100,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    const result = {
      transactions,
      pagination: {
        total,
        skip: query.skip || 0,
        take: query.take || 100,
      },
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 60);
    
    return result;
  }

  async getCustomerTransactions(customerId: string, query: TransactionQueryDto) {
    return this.getTransactions({ ...query, customerId });
  }

  async getTransaction(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        card: true,
        device: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async getTransactionStats(query: TransactionQueryDto) {
    const where: any = {};
    
    if (query.customerId) where.customerId = query.customerId;
    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = new Date(query.startDate);
      if (query.endDate) where.timestamp.lte = new Date(query.endDate);
    }

    const [stats, categoryBreakdown, merchantTop] = await Promise.all([
      this.prisma.transaction.aggregate({
        where,
        _sum: { amount: true },
        _avg: { amount: true },
        _count: true,
        _min: { amount: true },
        _max: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['mcc'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.groupBy({
        by: ['merchant'],
        where,
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      summary: {
        total: stats._sum.amount || 0,
        average: stats._avg.amount || 0,
        count: stats._count,
        min: stats._min.amount || 0,
        max: stats._max.amount || 0,
      },
      categoryBreakdown,
      topMerchants: merchantTop,
    };
  }

  async detectAnomalies(query: TransactionQueryDto) {
    const transactions = await this.getTransactions(query);
    const anomalies = [];

    for (const tx of transactions.transactions) {
      const anomalyScore = await this.calculateAnomalyScore(tx);
      
      if (anomalyScore > 0.7) {
        anomalies.push({
          transaction: tx,
          score: anomalyScore,
          reasons: await this.getAnomalyReasons(tx, anomalyScore),
        });
      }
    }

    return { anomalies };
  }

  private async calculateAnomalyScore(transaction: any): Promise<number> {
    let score = 0;
    
    if (parseFloat(transaction.amount.toString()) > 5000) score += 0.3;
    
    const recentTxns = await this.prisma.transaction.findMany({
      where: {
        customerId: transaction.customerId,
        timestamp: {
          gte: new Date(Date.now() - 3600000),
        },
      },
    });
    
    if (recentTxns.length > 5) score += 0.2;
    
    const uniqueLocations = new Set(recentTxns.map((tx: any) => tx.geo?.country).filter(Boolean));
    if (uniqueLocations.size > 2) score += 0.3;
    
    const highRiskMCCs = ['6011', '7995', '5816'];
    if (highRiskMCCs.includes(transaction.mcc)) score += 0.2;
    
    return Math.min(score, 1);
  }

  private async getAnomalyReasons(transaction: any, score: number): Promise<string[]> {
    const reasons = [];
    
    if (parseFloat(transaction.amount) > 5000) {
      reasons.push('High transaction amount');
    }
    
    if (score > 0.5) {
      reasons.push('Unusual spending pattern detected');
    }
    
    return reasons;
  }

  private async invalidateCache(pattern: string) {
    await this.redis.del(pattern);
  }
}