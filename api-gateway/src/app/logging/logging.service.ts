import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Centralized Logging Service for API Gateway.
 * Logs service failures, errors, and operational events.
 */
@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);
  private readonly correlationId?: string;

  constructor(configService: ConfigService) {
    this.correlationId = this.generateCorrelationId();
  }

  /**
   * Log service failure with context.
   */
  logServiceFailure(serviceName: string, endpoint: string, error: any, context?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      correlationId: this.correlationId,
      eventType: 'SERVICE_FAILURE',
      serviceName,
      endpoint,
      error: {
        message: error?.message || 'Unknown error',
        code: error?.code || 'UNKNOWN',
        stack: error?.stack,
      },
      context,
    };

    this.logger.error(`Service Failure: ${serviceName} - ${endpoint}`, JSON.stringify(logEntry));
  }

  /**
   * Log fallback response.
   */
  logFallback(serviceName: string, endpoint: string, fallbackType: string): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      correlationId: this.correlationId,
      eventType: 'FALLBACK_RESPONSE',
      serviceName,
      endpoint,
      fallbackType,
    };

    this.logger.warn(`Fallback activated: ${serviceName} - ${endpoint}`, JSON.stringify(logEntry));
  }

  /**
   * Log circuit breaker state change.
   */
  logCircuitBreakerChange(serviceName: string, state: 'OPEN' | 'CLOSED' | 'HALF_OPEN'): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      correlationId: this.correlationId,
      eventType: 'CIRCUIT_BREAKER_CHANGE',
      serviceName,
      state,
    };

    this.logger.log(`Circuit Breaker: ${serviceName} -> ${state}`, JSON.stringify(logEntry));
  }

  /**
   * Generate unique correlation ID for request tracing.
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current correlation ID.
   */
  getCorrelationId(): string {
    return this.correlationId || 'unknown';
  }
}
