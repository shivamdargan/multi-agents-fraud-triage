import { LoggerService } from '../common/services/logger.service';
import { MetricsService } from '../common/services/metrics.service';

export interface AgentContext {
  sessionId: string;
  customerId?: string;
  transactionId?: string;
  metadata?: any;
}

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  retries?: number;
}

export interface AgentConfig {
  maxRetries: number;
  timeoutMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerCooldownMs: number;
}

export abstract class BaseAgent {
  protected abstract name: string;
  protected failureCount = 0;
  protected circuitOpen = false;
  protected circuitOpenTime = 0;

  constructor(
    protected logger: LoggerService,
    protected metrics: MetricsService,
    protected config: AgentConfig,
  ) {}

  async execute(context: AgentContext, input: any): Promise<AgentResult> {
    const startTime = Date.now();
    
    if (this.isCircuitOpen()) {
      this.logger.warn(`Circuit breaker open for ${this.name}`);
      return {
        success: false,
        error: 'Circuit breaker open',
      };
    }

    let lastError: any;
    let retries = 0;

    for (let i = 0; i <= this.config.maxRetries; i++) {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), this.config.timeoutMs);
        });

        const result = await Promise.race([
          this.process(context, input),
          timeoutPromise,
        ]) as any;

        this.recordSuccess();
        
        const duration = Date.now() - startTime;
        this.metrics.recordLatency(`agent.${this.name}`, startTime);
        this.metrics.recordCounter(`agent.${this.name}.success`);

        this.logger.logAgentTrace(this.name, 'execute', {
          context,
          input,
          result,
          duration,
          retries,
        });

        return {
          success: true,
          data: result,
          duration,
          retries,
        };
      } catch (error) {
        lastError = error;
        retries = i;
        
        if (i < this.config.maxRetries) {
          const backoff = Math.min(150 * Math.pow(2, i), 1000);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
      }
    }

    this.recordFailure();
    this.metrics.recordCounter(`agent.${this.name}.failure`);
    
    this.logger.error(
      `Agent ${this.name} failed after ${retries} retries`,
      lastError?.message,
    );

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      duration: Date.now() - startTime,
      retries,
    };
  }

  protected abstract process(context: AgentContext, input: any): Promise<any>;

  protected validateInput(input: any, schema: any): void {
    // Implement validation logic
  }

  protected validateOutput(output: any, schema: any): void {
    // Implement validation logic
  }

  private isCircuitOpen(): boolean {
    if (!this.circuitOpen) return false;
    
    const now = Date.now();
    if (now - this.circuitOpenTime > this.config.circuitBreakerCooldownMs) {
      this.circuitOpen = false;
      this.failureCount = 0;
      return false;
    }
    
    return true;
  }

  private recordSuccess() {
    this.failureCount = 0;
  }

  private recordFailure() {
    this.failureCount++;
    
    if (this.failureCount >= this.config.circuitBreakerThreshold) {
      this.circuitOpen = true;
      this.circuitOpenTime = Date.now();
      this.logger.warn(`Circuit breaker opened for ${this.name}`);
    }
  }
}