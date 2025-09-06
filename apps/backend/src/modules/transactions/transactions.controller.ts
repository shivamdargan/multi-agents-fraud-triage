import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, TransactionQueryDto, UploadTransactionsDto } from './dto';

@ApiTags('transactions')
@Controller('transactions')
// @UseGuards(ThrottlerGuard) // DISABLED for development
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload transactions from CSV or JSON' })
  @ApiResponse({ status: 201, description: 'Transactions uploaded successfully' })
  async uploadTransactions(@Body() dto: UploadTransactionsDto) {
    return this.transactionsService.uploadTransactions(dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  async createTransaction(@Body() dto: CreateTransactionDto) {
    return this.transactionsService.createTransaction(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get transactions with filters' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getTransactions(@Query() query: TransactionQueryDto) {
    return this.transactionsService.getTransactions(query);
  }

  // Specific routes MUST come before parameterized routes
  @Get('stats/summary')
  @ApiOperation({ summary: 'Get transaction statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getTransactionStats(@Query() query: TransactionQueryDto) {
    return this.transactionsService.getTransactionStats(query);
  }

  @Get('anomalies/detect')
  @ApiOperation({ summary: 'Detect transaction anomalies' })
  @ApiResponse({ status: 200, description: 'Anomalies detected' })
  async detectAnomalies(@Query() query: TransactionQueryDto) {
    return this.transactionsService.detectAnomalies(query);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get transactions for a specific customer' })
  @ApiResponse({ status: 200, description: 'Customer transactions retrieved' })
  async getCustomerTransactions(
    @Param('customerId') customerId: string,
    @Query() query: TransactionQueryDto,
  ) {
    return this.transactionsService.getCustomerTransactions(customerId, query);
  }

  // Dynamic :id route MUST come last
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific transaction' })
  @ApiResponse({ status: 200, description: 'Transaction retrieved' })
  async getTransaction(@Param('id') id: string) {
    return this.transactionsService.getTransaction(id);
  }
}