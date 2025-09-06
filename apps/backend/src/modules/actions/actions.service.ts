import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';

@Injectable()
export class ActionsService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
  ) {}

  async freezeCard(cardId: string) {
    const card = await this.prisma.card.update({
      where: { id: cardId },
      data: { status: 'FROZEN' },
    });

    this.logger.log(`Card ${cardId} frozen`, 'ActionsService');

    return {
      success: true,
      action: 'CARD_FROZEN',
      cardId,
      status: card.status,
      timestamp: new Date().toISOString(),
    };
  }

  async unfreezeCard(cardId: string) {
    const card = await this.prisma.card.update({
      where: { id: cardId },
      data: { status: 'ACTIVE' },
    });

    this.logger.log(`Card ${cardId} unfrozen`, 'ActionsService');

    return {
      success: true,
      action: 'CARD_UNFROZEN',
      cardId,
      status: card.status,
      timestamp: new Date().toISOString(),
    };
  }

  async openDispute(data: any) {
    const dispute = await this.prisma.chargeback.create({
      data: {
        customerId: data.customerId,
        transactionId: data.transactionId,
        amount: data.amount,
        reason: data.reason,
        status: 'OPEN',
      },
    });

    this.logger.log(`Dispute opened: ${dispute.id}`, 'ActionsService');

    return {
      success: true,
      action: 'DISPUTE_OPENED',
      disputeId: dispute.id,
      status: dispute.status,
      timestamp: new Date().toISOString(),
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
}