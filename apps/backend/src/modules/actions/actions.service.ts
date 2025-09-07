import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ActionsService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
  ) {}

  async freezeCard(cardId: string, otp?: string) {
    // Check if card requires OTP
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: { customer: true },
    });

    if (!card) {
      throw new BadRequestException('Card not found');
    }

    // Check if this is a high-value card or VIP customer requiring OTP
    const flags = card.customer?.riskFlags as any;
    const requiresOtp = flags?.vipCustomer || card.status === 'ACTIVE';

    if (requiresOtp && !otp) {
      // Return pending OTP status
      return {
        status: 'PENDING_OTP',
        message: 'OTP required for card freeze',
        requiresOtp: true,
      };
    }

    if (requiresOtp && otp) {
      // Validate OTP (in production, check against actual OTP service)
      const validOtp = otp === '123456'; // Mock validation
      if (!validOtp) {
        throw new BadRequestException('Invalid OTP');
      }
    }

    // Freeze the card
    const updatedCard = await this.prisma.card.update({
      where: { id: cardId },
      data: { status: 'FROZEN' },
    });

    this.logger.log(`Card ${cardId} frozen`, 'ActionsService');

    return {
      status: 'FROZEN',
      success: true,
      card: updatedCard,
      message: 'Card frozen successfully',
    };
  }

  async unfreezeCard(cardId: string, otp?: string) {
    // Always require OTP for unfreezing
    if (!otp) {
      return {
        status: 'PENDING_OTP',
        message: 'OTP required for card unfreeze',
        requiresOtp: true,
      };
    }

    // Validate OTP
    const validOtp = otp === '123456';
    if (!validOtp) {
      throw new BadRequestException('Invalid OTP');
    }

    const card = await this.prisma.card.update({
      where: { id: cardId },
      data: { status: 'ACTIVE' },
    });

    this.logger.log(`Card ${cardId} unfrozen`, 'ActionsService');

    return {
      status: 'ACTIVE',
      success: true,
      card,
      message: 'Card unfrozen successfully',
    };
  }

  async openDispute(data: { 
    txnId: string; 
    reasonCode: string; 
    confirm: boolean;
    reason?: string;
  }) {
    if (!data.confirm) {
      throw new BadRequestException('Confirmation required to open dispute');
    }

    // Find the transaction
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: data.txnId },
    });

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    const caseId = `CASE_${uuidv4().slice(0, 8).toUpperCase()}`;
    
    const dispute = await this.prisma.chargeback.create({
      data: {
        id: caseId,
        customerId: transaction.customerId,
        transactionId: data.txnId,
        amount: transaction.amount,
        reason: data.reason || `Dispute for reason code ${data.reasonCode}`,
        status: 'OPEN',
      },
    });

    this.logger.log(`Dispute opened: ${caseId}`, 'ActionsService');

    return {
      caseId,
      status: 'OPEN',
      message: 'Dispute created successfully',
    };
  }

  async contactCustomer(data: any) {
    this.logger.log(
      `Customer contact initiated for ${data.customerId}`,
      'ActionsService',
    );

    return {
      success: true,
      action: 'CUSTOMER_CONTACT_INITIATED',
      customerId: data.customerId,
      method: data.method || 'EMAIL',
      message: data.message,
      timestamp: new Date().toISOString(),
    };
  }

  async getDisputeByTransaction(transactionId: string) {
    const dispute = await this.prisma.chargeback.findFirst({
      where: { 
        transactionId,
        status: { in: ['OPEN', 'INVESTIGATING'] }
      },
      orderBy: { createdAt: 'desc' },
    });

    return dispute;
  }

  async getCustomerDisputes(customerId: string) {
    const disputes = await this.prisma.chargeback.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });

    return disputes;
  }
}