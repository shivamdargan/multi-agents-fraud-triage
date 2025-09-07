import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ActionsService } from './actions.service';

@ApiTags('action')
@Controller('action')
@UseGuards(ThrottlerGuard)
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Post('freeze-card')
  @ApiOperation({ summary: 'Freeze a card' })
  async freezeCard(@Body() body: { cardId: string; otp?: string }) {
    return this.actionsService.freezeCard(body.cardId, body.otp);
  }

  @Post('unfreeze-card')
  @ApiOperation({ summary: 'Unfreeze a card' })
  async unfreezeCard(@Body() body: { cardId: string; otp?: string }) {
    return this.actionsService.unfreezeCard(body.cardId, body.otp);
  }

  @Post('open-dispute')
  @ApiOperation({ summary: 'Open a dispute' })
  async openDispute(@Body() body: { 
    txnId: string; 
    reasonCode: string; 
    confirm: boolean;
    reason?: string;
  }) {
    return this.actionsService.openDispute(body);
  }

  @Post('contact-customer')
  @ApiOperation({ summary: 'Initiate customer contact' })
  async contactCustomer(@Body() body: any) {
    return this.actionsService.contactCustomer(body);
  }

  @Get('dispute/transaction/:transactionId')
  @ApiOperation({ summary: 'Get dispute for a transaction' })
  async getDisputeByTransaction(@Param('transactionId') transactionId: string) {
    return this.actionsService.getDisputeByTransaction(transactionId);
  }

  @Get('disputes/customer/:customerId')
  @ApiOperation({ summary: 'Get all disputes for a customer' })
  async getCustomerDisputes(@Param('customerId') customerId: string) {
    return this.actionsService.getCustomerDisputes(customerId);
  }
}