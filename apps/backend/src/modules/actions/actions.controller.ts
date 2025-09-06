import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ActionsService } from './actions.service';

@ApiTags('actions')
@Controller('actions')
@UseGuards(ThrottlerGuard)
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Post('freeze-card/:cardId')
  @ApiOperation({ summary: 'Freeze a card' })
  async freezeCard(@Param('cardId') cardId: string) {
    return this.actionsService.freezeCard(cardId);
  }

  @Post('unfreeze-card/:cardId')
  @ApiOperation({ summary: 'Unfreeze a card' })
  async unfreezeCard(@Param('cardId') cardId: string) {
    return this.actionsService.unfreezeCard(cardId);
  }

  @Post('open-dispute')
  @ApiOperation({ summary: 'Open a dispute' })
  async openDispute(@Body() body: any) {
    return this.actionsService.openDispute(body);
  }

  @Post('contact-customer')
  @ApiOperation({ summary: 'Initiate customer contact' })
  async contactCustomer(@Body() body: any) {
    return this.actionsService.contactCustomer(body);
  }
}