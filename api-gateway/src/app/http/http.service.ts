import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, retry, catchError, throwError, timeout } from 'rxjs';

/**
 * HTTP Service with retry logic and error handling.
 * Provides resilient communication with backend services.
 */
@Injectable()
export class ResilientHttpService {
  private readonly logger = new Logger(ResilientHttpService.name);
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.timeoutMs = this.configService.get<number>('HTTP_TIMEOUT', 5000);
    this.maxRetries = this.configService.get<number>('HTTP_MAX_RETRIES', 3);
  }

  /**
   * GET request with retry logic and timeout.
   */
  async get<T>(url: string, options?: any): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(url, options).pipe(
          timeout(this.timeoutMs),
          retry(this.maxRetries),
          catchError((error) => {
            this.logger.error(`HTTP GET failed: ${url}`, (error as Error).message);
            return throwError(() => error);
          }),
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Request failed after ${this.maxRetries} retries: ${url}`, (error as Error).message);
      throw error;
    }
  }

  /**
   * POST request with retry logic and timeout.
   */
  async post<T>(url: string, data?: any, options?: any): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<T>(url, data, options).pipe(
          timeout(this.timeoutMs),
          retry(this.maxRetries),
          catchError((error) => {
            this.logger.error(`HTTP POST failed: ${url}`, (error as Error).message);
            return throwError(() => error);
          }),
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Request failed after ${this.maxRetries} retries: ${url}`, (error as Error).message);
      throw error;
    }
  }
}
