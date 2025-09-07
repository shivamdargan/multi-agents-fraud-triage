import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { InsightsService } from './insights.service';

@ApiTags('insights')
@Controller('insights')
@UseGuards(ThrottlerGuard)
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get('spend/:customerId')
  @ApiOperation({ summary: 'Get spending insights for a customer' })
  @ApiResponse({ status: 200, description: 'Spending insights retrieved' })
  async getSpendInsights(
    @Param('customerId') customerId: string,
    @Query('period') period?: string,
  ) {
    return this.insightsService.getSpendInsights(customerId, period);
  }

  @Get('categories/:customerId')
  @ApiOperation({ summary: 'Get category breakdown for a customer' })
  @ApiResponse({ status: 200, description: 'Category breakdown retrieved' })
  async getCategoryBreakdown(@Param('customerId') customerId: string) {
    return this.insightsService.getCategoryBreakdown(customerId);
  }

  @Get('merchants/:customerId')
  @ApiOperation({ summary: 'Get top merchants for a customer' })
  @ApiResponse({ status: 200, description: 'Top merchants retrieved' })
  async getTopMerchants(
    @Param('customerId') customerId: string,
    @Query('limit') limit?: number,
  ) {
    return this.insightsService.getTopMerchants(customerId, limit || 10);
  }

  @Get('time-series/:customerId')
  @ApiOperation({ summary: 'Get time series data for a customer' })
  @ApiResponse({ status: 200, description: 'Time series data retrieved' })
  async getTimeSeriesData(
    @Param('customerId') customerId: string,
    @Query('metric') metric: string,
    @Query('period') period: string,
  ) {
    return this.insightsService.getTimeSeriesData(customerId, metric, period);
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate a report' })
  @ApiResponse({ status: 201, description: 'Report generation started' })
  async generateReport(@Body() body: { customerId: string; type: string }) {
    console.log('Report generation request received:', body);
    return this.insightsService.generateReport(body.customerId, body.type);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get generated reports' })
  @ApiResponse({ status: 200, description: 'Reports retrieved' })
  async getReports(@Query('customerId') customerId?: string) {
    return this.insightsService.getReports(customerId);
  }

  @Get(':customerId/summary')
  @ApiOperation({ summary: 'Get customer insights summary' })
  @ApiResponse({ status: 200, description: 'Summary retrieved' })
  async getCustomerSummary(@Param('customerId') customerId: string) {
    return this.insightsService.getCustomerSummary(customerId);
  }
}