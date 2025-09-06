import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('API');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = request;
    const now = Date.now();

    // Log API call details
    this.logger.log(`📍 API Call: ${method} ${url}`);
    
    if (Object.keys(params).length > 0) {
      this.logger.debug(`Params: ${JSON.stringify(params)}`);
    }
    
    if (Object.keys(query).length > 0) {
      this.logger.debug(`Query: ${JSON.stringify(query)}`);
    }

    return next.handle().pipe(
      tap((response) => {
        const responseTime = Date.now() - now;
        this.logger.log(
          `✨ API Response: ${method} ${url} - ${responseTime}ms`,
        );
        
        // Log response data for debugging (truncated)
        if (response && typeof response === 'object') {
          const responseStr = JSON.stringify(response).substring(0, 200);
          this.logger.debug(`Response Data: ${responseStr}...`);
        }
      }),
      catchError((error) => {
        const responseTime = Date.now() - now;
        this.logger.error(
          `💥 API Error: ${method} ${url} - ${responseTime}ms - ${error.message}`,
          error.stack,
        );
        throw error;
      }),
    );
  }
}