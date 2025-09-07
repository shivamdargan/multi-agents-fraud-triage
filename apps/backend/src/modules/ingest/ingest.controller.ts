import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IngestService } from './ingest.service';

@ApiTags('ingest')
@Controller('ingest')
export class IngestController {
  constructor(private readonly ingestService: IngestService) {}

  @Post('transactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ingest batch of transactions' })
  @ApiResponse({ status: 200, description: 'Transactions accepted' })
  async ingestTransactions(@Body() transactions: any[]) {
    return this.ingestService.ingestTransactions(transactions);
  }
}