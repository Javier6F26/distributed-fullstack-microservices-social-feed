import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { retry, catchError } from 'rxjs/operators';

/**
 * Retry Interceptor for HTTP requests.
 * Automatically retries failed requests with exponential backoff.
 */
@Injectable()
export class RetryInterceptor implements HttpInterceptor {
  private readonly maxRetries = 2;

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      retry(this.maxRetries),
      catchError((error: HttpErrorResponse) => {
        // Don't retry on client errors (4xx) except 429
        if (error.status >= 400 && error.status < 500 && error.status !== 429) {
          return throwError(() => error);
        }

        // For server errors (5xx) or 429, retry
        return throwError(() => error);
      })
    );
  }
}
