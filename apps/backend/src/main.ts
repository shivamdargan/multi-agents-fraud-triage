import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { LoggerService } from './common/services/logger.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { NotFoundExceptionFilter } from './common/filters/not-found.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  logger.log('🚀 Starting Aegis Support Backend Server...');
  
  const app = await NestFactory.create(AppModule, {
    logger: new LoggerService(),
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  
  logger.log(`📋 Environment: ${nodeEnv}`);

  app.use(helmet());
  logger.log('🔒 Helmet security middleware enabled');

  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });
  logger.log(`🌐 CORS enabled for origin: ${corsOrigin}`);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  logger.log('📌 API versioning enabled (v1)');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  logger.log('✅ Global validation pipe configured');

  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new NotFoundExceptionFilter(),
  );
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new LoggingInterceptor(),
  );
  logger.log('🎯 Global filters and interceptors configured');

  const config = new DocumentBuilder()
    .setTitle('Aegis Support API')
    .setDescription('Internal API for fraud detection and transaction analysis')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('transactions')
    .addTag('insights')
    .addTag('fraud')
    .addTag('agents')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  logger.log('📚 Swagger documentation generated');

  await app.listen(port);
  
  logger.log('');
  logger.log('='.repeat(60));
  logger.log('🎉 AEGIS SUPPORT BACKEND SERVER STARTED SUCCESSFULLY! 🎉');
  logger.log('='.repeat(60));
  logger.log(`🔌 Server Port:        ${port}`);
  logger.log(`🌍 Server URL:         http://localhost:${port}`);
  logger.log(`📡 API Base URL:       http://localhost:${port}/v1`);
  logger.log(`📖 API Documentation:  http://localhost:${port}/api/docs`);
  logger.log(`🏥 Health Check:       http://localhost:${port}/v1/health`);
  logger.log(`⚙️  Environment:        ${nodeEnv}`);
  logger.log(`🔀 CORS Origin:        ${corsOrigin}`);
  logger.log('='.repeat(60));
  logger.log('');
  
  // Log system info
  logger.log('📊 System Information:');
  logger.log(`   - Node Version:     ${process.version}`);
  logger.log(`   - Process ID:       ${process.pid}`);
  logger.log(`   - Platform:         ${process.platform}`);
  logger.log(`   - Memory Usage:     ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  logger.log('');
  logger.log('👀 Monitoring all incoming requests...');
  logger.log('');
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ Failed to start server:', error);
  process.exit(1);
});