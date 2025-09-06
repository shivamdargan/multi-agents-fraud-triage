import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { EvalsService } from './evals.service';

@ApiTags('evals')
@Controller('evals')
@UseGuards(ThrottlerGuard)
export class EvalsController {
  constructor(private readonly evalsService: EvalsService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run evaluation suite' })
  async runEvaluation(@Body() body: { name: string; cases?: string[] }) {
    return this.evalsService.runEvaluation(body.name, body.cases);
  }

  @Get('runs')
  @ApiOperation({ summary: 'Get evaluation runs' })
  async getEvalRuns() {
    return this.evalsService.getEvalRuns();
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'Get specific evaluation run' })
  async getEvalRun(@Param('id') id: string) {
    return this.evalsService.getEvalRun(id);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get evaluation metrics' })
  async getMetrics() {
    return this.evalsService.getMetrics();
  }
}