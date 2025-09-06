import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private health: HealthCheckService,
    private prisma: PrismaService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check endpoint' })
  async check() {
    this.logger.log('🏥 Health check requested');
    
    const result = await this.health.check([
      async () => {
        const isHealthy = await this.prisma.healthCheck();
        const dbStatus = isHealthy ? 'up' : 'down';
        this.logger.debug(`Database health: ${dbStatus}`);
        return {
          database: {
            status: dbStatus,
          },
        };
      },
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);

    const status = result.status === 'ok' ? '✅' : '❌';
    this.logger.log(`${status} Health check completed: ${result.status}`);
    
    return result;
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  ready() {
    this.logger.debug('🟢 Readiness probe checked');
    return { status: 'ready', timestamp: new Date().toISOString() };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    this.logger.debug('💚 Liveness probe checked');
    return { status: 'alive', timestamp: new Date().toISOString() };
  }
}