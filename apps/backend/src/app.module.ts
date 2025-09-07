import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { TerminusModule } from '@nestjs/terminus';

import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { InsightsModule } from './modules/insights/insights.module';
import { FraudModule } from './modules/fraud/fraud.module';
import { ActionsModule } from './modules/actions/actions.module';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module';
import { EvalsModule } from './modules/evals/evals.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { HealthModule } from './modules/health/health.module';
import { AgentsModule } from './agents/agents.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CustomersModule } from './modules/customers/customers.module';
import { IngestModule } from './modules/ingest/ingest.module';
import { CardsModule } from './modules/cards/cards.module';
import { LoggingMiddleware } from './middleware/logging.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 1000, // Increased for development
    }]),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 60000,
      max: 100,
    }),
    TerminusModule,
    DatabaseModule,
    CommonModule,
    DashboardModule,
    CustomersModule,
    CardsModule,
    TransactionsModule,
    InsightsModule,
    FraudModule,
    ActionsModule,
    KnowledgeBaseModule,
    EvalsModule,
    MetricsModule,
    HealthModule,
    AgentsModule,
    IngestModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggingMiddleware)
      .forRoutes('*');
  }
}