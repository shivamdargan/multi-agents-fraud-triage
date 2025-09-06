import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Sse,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Observable } from 'rxjs';
import { FraudService } from './fraud.service';
import { TriageRequestDto, AlertQueryDto, UpdateAlertDto } from './dto';

@ApiTags('fraud')
@Controller('fraud')
@UseGuards(ThrottlerGuard)
export class FraudController {
  constructor(private readonly fraudService: FraudService) {}

  @Post('triage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run fraud triage on a customer or transaction' })
  @ApiResponse({ status: 200, description: 'Triage completed' })
  async runTriage(@Body() dto: TriageRequestDto) {
    return this.fraudService.runTriage(dto);
  }

  @Sse('triage/:sessionId/stream')
  @ApiOperation({ summary: 'Stream triage progress' })
  triageStream(@Param('sessionId') sessionId: string): Observable<any> {
    return this.fraudService.streamTriageProgress(sessionId);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get fraud alerts' })
  @ApiResponse({ status: 200, description: 'Alerts retrieved' })
  async getAlerts(@Query() query: AlertQueryDto) {
    return this.fraudService.getAlerts(query);
  }

  @Get('alerts/:id')
  @ApiOperation({ summary: 'Get specific alert details' })
  @ApiResponse({ status: 200, description: 'Alert retrieved' })
  async getAlert(@Param('id') id: string) {
    return this.fraudService.getAlert(id);
  }

  @Put('alerts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update alert status' })
  @ApiResponse({ status: 200, description: 'Alert updated' })
  async updateAlert(@Param('id') id: string, @Body() dto: UpdateAlertDto) {
    return this.fraudService.updateAlert(id, dto);
  }

  @Get('risk-signals/:customerId')
  @ApiOperation({ summary: 'Get risk signals for a customer' })
  @ApiResponse({ status: 200, description: 'Risk signals retrieved' })
  async getRiskSignals(@Param('customerId') customerId: string) {
    return this.fraudService.getRiskSignals(customerId);
  }

  @Get('queue')
  @ApiOperation({ summary: 'Get fraud alert queue' })
  @ApiResponse({ status: 200, description: 'Queue retrieved' })
  async getFraudQueue(@Query('status') status?: string) {
    return this.fraudService.getFraudQueue(status);
  }

  @Post('actions/freeze-card/:cardId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Freeze a card' })
  @ApiResponse({ status: 200, description: 'Card frozen' })
  async freezeCard(@Param('cardId') cardId: string) {
    return this.fraudService.freezeCard(cardId);
  }

  @Post('actions/dispute/:transactionId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a dispute' })
  @ApiResponse({ status: 201, description: 'Dispute created' })
  async createDispute(@Param('transactionId') transactionId: string, @Body() body: any) {
    return this.fraudService.createDispute(transactionId, body);
  }
}