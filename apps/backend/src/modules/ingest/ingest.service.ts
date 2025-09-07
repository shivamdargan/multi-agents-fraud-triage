import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ingestTransactions(transactions: any[]) {
    const requestId = uuidv4();
    let count = 0;

    try {
      // Process transactions in batch
      for (const tx of transactions) {
        await this.prisma.transaction.create({
          data: {
            id: tx.id || uuidv4(),
            customerId: tx.customerId,
            cardId: tx.cardId,
            amount: tx.amount,
            currency: tx.currency || 'USD',
            mcc: tx.mcc,
            merchant: tx.merchant,
            timestamp: new Date(tx.timestamp),
            geo: tx.geo || {},
          },
        });
        count++;
      }

      // Check for fraud patterns
      await this.checkFraudPatterns(transactions);

      this.logger.log(`Ingested ${count} transactions with requestId: ${requestId}`);

      return {
        accepted: true,
        count,
        requestId,
      };
    } catch (error) {
      this.logger.error(`Failed to ingest transactions: ${error.message}`);
      return {
        accepted: false,
        count: 0,
        requestId,
        error: error.message,
      };
    }
  }

  private async checkFraudPatterns(transactions: any[]) {
    // Check for high-risk patterns and create alerts
    for (const tx of transactions) {
      const isHighRisk = this.evaluateRisk(tx);
      
      if (isHighRisk) {
        await this.prisma.alert.create({
          data: {
            id: uuidv4(),
            customerId: tx.customerId,
            type: 'FRAUD',
            severity: 'HIGH',
            riskScore: 0.8,
            reasons: ['High-risk transaction pattern detected'],
            status: 'PENDING',
            metadata: {
              transactionId: tx.id,
              cardId: tx.cardId,
              amount: tx.amount,
              merchant: tx.merchant,
            },
          },
        });
      }
    }
  }

  private evaluateRisk(transaction: any): boolean {
    // Simple risk evaluation logic
    const highRiskMCCs = ['6011', '7995', '5816'];
    const highAmount = Math.abs(transaction.amount) > 1000;
    const isHighRiskMCC = highRiskMCCs.includes(transaction.mcc);
    
    return highAmount || isHighRiskMCC;
  }
}