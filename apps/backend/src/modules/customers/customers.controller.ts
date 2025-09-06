import { Controller, Get, Post, Body, Param, Query, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CustomersService } from './customers.service';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all customers' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully' })
  async getAll(
    @Query('search') search?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.customersService.getAll({ search, riskLevel, limit, offset });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiResponse({ status: 200, description: 'Customer retrieved successfully' })
  async getById(@Param('id') id: string) {
    return this.customersService.getById(id);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get customer transactions' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getTransactions(
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.customersService.getTransactions(id, { limit, offset, startDate, endDate });
  }

  @Get(':id/insights')
  @ApiOperation({ summary: 'Get customer insights' })
  @ApiResponse({ status: 200, description: 'Insights retrieved successfully' })
  async getInsights(@Param('id') id: string) {
    return this.customersService.getInsights(id);
  }

  @Patch(':id/risk-level')
  @ApiOperation({ summary: 'Update customer risk level' })
  @ApiResponse({ status: 200, description: 'Risk level updated successfully' })
  async updateRiskLevel(
    @Param('id') id: string,
    @Body('riskLevel') riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
  ) {
    return this.customersService.updateRiskLevel(id, riskLevel);
  }
}