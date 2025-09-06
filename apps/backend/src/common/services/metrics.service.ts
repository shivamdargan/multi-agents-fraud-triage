import { Injectable } from '@nestjs/common';
import { LoggerService } from './logger.service';

export interface Metric {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp?: Date;
}

@Injectable()
export class MetricsService {
  private metrics: Map<string, Metric[]> = new Map();

  constructor(private logger: LoggerService) {}

  recordCounter(name: string, value: number = 1, labels?: Record<string, string>) {
    this.recordMetric({
      name,
      value,
      labels,
      timestamp: new Date(),
    });
  }

  recordGauge(name: string, value: number, labels?: Record<string, string>) {
    this.recordMetric({
      name,
      value,
      labels,
      timestamp: new Date(),
    });
  }

  recordHistogram(name: string, value: number, labels?: Record<string, string>) {
    this.recordMetric({
      name,
      value,
      labels,
      timestamp: new Date(),
    });
  }

  recordLatency(name: string, startTime: number, labels?: Record<string, string>) {
    const duration = Date.now() - startTime;
    this.recordHistogram(`${name}_duration_ms`, duration, labels);
  }

  private recordMetric(metric: Metric) {
    const key = this.getMetricKey(metric.name, metric.labels);
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    this.metrics.get(key)!.push(metric);
    
    this.logger.logStructured('debug', 'Metric recorded', {
      metric: metric.name,
      value: metric.value,
      labels: metric.labels,
    });
  }

  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    
    const labelString = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    
    return `${name}{${labelString}}`;
  }

  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    this.metrics.forEach((values, key) => {
      const latest = values[values.length - 1];
      result[key] = {
        value: latest.value,
        timestamp: latest.timestamp,
        count: values.length,
      };
    });
    
    return result;
  }

  clearMetrics() {
    this.metrics.clear();
  }
}