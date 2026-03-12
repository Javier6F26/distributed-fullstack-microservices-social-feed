import { Injectable, ErrorHandler, inject } from '@angular/core';
import { NotificationService } from '../../services/notification.service';
import { environment } from '../../../environments/environment';

/**
 * Global Error Handler for Angular Application.
 * Catches unhandled errors and displays user-friendly messages.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private notificationService = inject(NotificationService);

  handleError(error: unknown): void {

    // Log error to console (for development)
    console.error('Global Error Handler caught:', error);

    // CRITICAL: Suppress 401 errors - they are handled by AuthInterceptor
    // Showing notifications for 401s causes spam during token refresh failures
    if (this.isAuthenticationError(error)) {
      console.warn('[GlobalErrorHandler] Suppressing 401 notification - handled by AuthInterceptor');
      return;
    }

    // Log technical details in development mode
    if (!environment.production) {
      console.error('[Dev Mode] Error details:', error);
    }

    // Display user-friendly notification with deduplication
    this.notificationService.error(error, 5000);

    // Re-throw error (optional - depends on whether you want to crash or not)
    // In most cases, we want to continue running
  }

  /**
   * Check if error is an authentication error (401)
   * These are handled by AuthInterceptor and should not show notifications
   */
  private isAuthenticationError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'status' in error) {
      const httpError = error as { status: number };
      return httpError.status === 401;
    }
    return false;
  }
}
