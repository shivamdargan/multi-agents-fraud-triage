import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const { ip, method, originalUrl, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    // Log incoming request
    this.logger.log(
      `➡️  ${method} ${originalUrl} - ${ip} - ${userAgent.substring(0, 50)}`,
    );

    // Log request body for POST/PUT/PATCH (excluding sensitive endpoints)
    if (['POST', 'PUT', 'PATCH'].includes(method) && !originalUrl.includes('/auth')) {
      this.logger.debug(`Request Body: ${JSON.stringify(request.body).substring(0, 500)}`);
    }

    // Capture the original send method
    const originalSend = response.send;
    response.send = function(data) {
      response.send = originalSend;
      return response.send(data);
    };

    // Log response
    response.on('finish', () => {
      const { statusCode } = response;
      const contentLength = response.get('content-length');
      const responseTime = Date.now() - startTime;

      // Choose log level based on status code
      const logLevel = statusCode >= 500 ? 'error' : 
                      statusCode >= 400 ? 'warn' : 
                      'log';

      const emoji = statusCode >= 500 ? '❌' :
                   statusCode >= 400 ? '⚠️' :
                   statusCode >= 300 ? '↪️' :
                   '✅';

      this.logger[logLevel](
        `${emoji} ${method} ${originalUrl} ${statusCode} - ${responseTime}ms - ${contentLength || 0} bytes`,
      );

      // Log 404s specifically
      if (statusCode === 404) {
        this.logger.warn(`🔍 404 Not Found: ${method} ${originalUrl} from ${ip}`);
      }

      // Log slow requests
      if (responseTime > 1000) {
        this.logger.warn(`🐌 Slow Request: ${method} ${originalUrl} took ${responseTime}ms`);
      }
    });

    next();
  }
}