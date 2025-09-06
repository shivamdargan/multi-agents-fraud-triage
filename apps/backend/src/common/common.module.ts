import { Module, Global } from '@nestjs/common';
import { LoggerService } from './services/logger.service';
import { RedisService } from './services/redis.service';
import { MetricsService } from './services/metrics.service';
import { ValidationService } from './services/validation.service';

@Global()
@Module({
  providers: [
    LoggerService,
    RedisService,
    MetricsService,
    ValidationService,
  ],
  exports: [
    LoggerService,
    RedisService,
    MetricsService,
    ValidationService,
  ],
})
export class CommonModule {}