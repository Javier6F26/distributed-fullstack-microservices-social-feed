import { Injectable, inject, NgZone } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private broadcastChannel: BroadcastChannel | null = null;
  private readonly BROADCAST_CHANNEL_NAME = 'auth_refresh_sync';

  constructor() {
    // Initialize BroadcastChannel for cross-tab refresh synchronization
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel(this.BROADCAST_CHANNEL_NAME);
      
      // Listen for refresh events from other tabs
      this.broadcastChannel.onmessage = (event) => {
        if (event.data.type === 'refresh_started') {
          // Another tab is refreshing, set our flag
          this.isRefreshing = true;
        } else if (event.data.type === 'refresh_completed') {
          // Refresh completed in another tab
          this.isRefreshing = false;
          this.refreshTokenSubject.next(true);
        } else if (event.data.type === 'refresh_failed') {
          // Refresh failed in another tab
          this.isRefreshing = false;
          this.refreshTokenSubject.next(true);
        } else if (event.data.type === 'logout') {
          // User logged out in another tab - notify subscribers
          // Note: We don't clear state directly here to avoid circular dependencies
          // The AuthService should handle state cleanup when it receives the logout response
          console.log('Logout detected in another tab');
          // Trigger a 401-like response to force state cleanup
          this.refreshTokenSubject.next(false);
        }
      };
    }
  }

  /**
   * Broadcast refresh event to all tabs
   */
  private broadcastRefreshEvent(type: 'started' | 'completed' | 'failed'): void {
    if (this.broadcastChannel) {
      this.ngZone.run(() => {
        this.broadcastChannel?.postMessage({ type: `refresh_${type}`, timestamp: Date.now() });
      });
    }
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Skip auth endpoints to prevent infinite loops
    // Login/register should handle their own errors, not trigger token refresh
    const skipUrls = ['/auth/login', '/auth/register', '/auth/refresh'];
    if (skipUrls.some(url => request.url.includes(url))) {
      return next.handle(request);
    }

    // Add authorization header if token exists
    const token = this.authService.getAccessToken();
    if (token) {
      request = this.addToken(request, token);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Log 401 error with request context for debugging
          console.warn(`[AuthInterceptor] 401 Unauthorized - URL: ${request.url}, Method: ${request.method}`);
          // Token expired or invalid - attempt refresh
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private addToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private handle401Error(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.isRefreshing) {
      // If already refreshing (in this tab or another), wait for the refresh to complete
      console.log(`[AuthInterceptor] Refresh in progress, waiting - URL: ${request.url}`);
      return this.refreshTokenSubject.pipe(
        filter(isRefreshing => !isRefreshing),
        take(1),
        switchMap(() => {
          // After refresh, retry the original request with new token
          const newToken = this.authService.getAccessToken();
          if (newToken) {
            console.log(`[AuthInterceptor] Retry request after refresh - URL: ${request.url}`);
            return next.handle(this.addToken(request, newToken));
          } else {
            // Refresh failed, logout user
            console.warn('[AuthInterceptor] Refresh failed, proceeding to logout');
            return this.handleLogout();
          }
        })
      );
    } else {
      // Start the refresh process
      this.isRefreshing = true;
      this.refreshTokenSubject.next(false);

      console.log(`[AuthInterceptor] Starting token refresh - triggered by: ${request.url}`);

      // Broadcast to other tabs that we're refreshing
      this.broadcastRefreshEvent('started');

      return this.authService.refreshToken().pipe(
        switchMap((response) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(true);

          console.log(`[AuthInterceptor] Refresh completed successfully, retrying: ${request.url}`);

          // Broadcast to other tabs that refresh completed
          this.broadcastRefreshEvent('completed');

          // Retry the original request with new token
          return next.handle(this.addToken(request, response.accessToken));
        }),
        catchError((error) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(true);

          console.error(`[AuthInterceptor] Refresh failed - error: ${error?.message || 'Unknown'}`);

          // Broadcast to other tabs that refresh failed
          this.broadcastRefreshEvent('failed');

          // Refresh failed, logout user
          return this.handleLogout();
        })
      );
    }
  }

  private handleLogout(): Observable<never> {
    // Log logout event for debugging
    console.warn('[AuthInterceptor] Handling logout - session expired or refresh failed');

    // Clear auth state first
    this.authService.logout().subscribe();

    // Show notification and redirect
    this.notificationService.error('Your session has expired. Please log in again.', 5000);
    
    // Navigate to login
    this.router.navigate(['/auth/login']).then();
    
    return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));
  }
}
