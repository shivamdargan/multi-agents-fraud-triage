import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from '../../common/services/metrics.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Get application metrics' })
  getMetrics() {
    return this.metricsService.getMetrics();
  }

  @Get('prometheus')
  @ApiOperation({ summary: 'Get metrics in Prometheus format' })
  getPrometheusMetrics() {
    const metrics = this.metricsService.getMetrics();
    let output = '';

    for (const [key, value] of Object.entries(metrics)) {
      const metricName = key.replace(/[{}]/g, '').replace(/[^a-zA-Z0-9_]/g, '_');
      output += `# TYPE ${metricName} gauge\n`;
      output += `${metricName} ${value.value} ${new Date(value.timestamp).getTime()}\n`;
    }

    return output;
  }
}