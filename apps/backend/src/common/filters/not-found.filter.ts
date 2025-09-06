import {
  ExceptionFilter,
  Catch,
  NotFoundException,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(NotFoundException)
export class NotFoundExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('404-Handler');

  catch(exception: NotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const errorResponse: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: 'Resource not found',
      error: 'Not Found',
    };

    // Log 404 with details
    this.logger.warn(
      `🚫 404 Not Found: ${request.method} ${request.url} | IP: ${request.ip} | User-Agent: ${request.get('user-agent')?.substring(0, 50)}`,
    );

    // Log request body if present (for debugging)
    if (request.body && Object.keys(request.body).length > 0) {
      this.logger.debug(`404 Request Body: ${JSON.stringify(request.body).substring(0, 200)}`);
    }

    // Suggest possible endpoints
    const suggestions = this.getSuggestions(request.url);
    if (suggestions.length > 0) {
      errorResponse.suggestions = suggestions;
      this.logger.log(`💡 Did you mean: ${suggestions.join(', ')}?`);
    }

    response.status(status).json(errorResponse);
  }

  private getSuggestions(url: string): string[] {
    const knownEndpoints = [
      '/v1/dashboard/metrics',
      '/v1/customers',
      '/v1/transactions',
      '/v1/fraud/alerts',
      '/v1/fraud/triage',
      '/v1/insights/report',
      '/v1/alerts',
      '/v1/health',
    ];

    // Simple similarity check
    return knownEndpoints
      .filter(endpoint => {
        const urlParts = url.toLowerCase().split('/');
        const endpointParts = endpoint.toLowerCase().split('/');
        return urlParts.some(part => 
          endpointParts.some(ePart => 
            part.length > 2 && ePart.includes(part)
          )
        );
      })
      .slice(0, 3);
  }
}