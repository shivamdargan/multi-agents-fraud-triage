import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { KnowledgeBaseService } from './knowledge-base.service';

@ApiTags('knowledge-base')
@Controller('kb')
@UseGuards(ThrottlerGuard)
export class KnowledgeBaseController {
  constructor(private readonly kbService: KnowledgeBaseService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search knowledge base' })
  async search(@Query('query') query: string) {
    return this.kbService.search(query);
  }

  @Get('lookup')
  @ApiOperation({ summary: 'Lookup by anchor' })
  async lookup(@Query('anchor') anchor: string) {
    return this.kbService.lookup(anchor);
  }

  @Post('add')
  @ApiOperation({ summary: 'Add knowledge base entry' })
  async addEntry(@Body() body: any) {
    return this.kbService.addEntry(body);
  }
}