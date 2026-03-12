import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NotificationService } from '../../services/notification.service';

/**
 * Rate Limit Interceptor
 * Handles 429 Too Many Requests responses globally.
 * Displays user-friendly notifications and extracts retry-after header.
 */
@Injectable({
  providedIn: 'root',
})
export class RateLimitInterceptor implements HttpInterceptor {
  private notificationService = inject(NotificationService);

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 429) {
          // Extract retry-after header
          const retryAfter = error.headers.get('Retry-After');
          const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 60;

          // Show user-friendly notification
          this.notificationService.error(
            `Too many requests. Please wait ${retrySeconds} seconds before trying again.`,
            5000
          );
        }

        return throwError(() => error);
      })
    );
  }
}
