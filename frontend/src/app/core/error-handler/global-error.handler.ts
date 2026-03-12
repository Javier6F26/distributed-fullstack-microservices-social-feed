import { Injectable, ErrorHandler, inject } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

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

    // Extract user-friendly message
    const message = this.extractErrorMessage(error);

    // Display user-friendly notification
    this.notificationService.error(message, 5000);

    // Re-throw error (optional - depends on whether you want to crash or not)
    // In most cases, we want to continue running
  }

  /**
   * Extract user-friendly error message from error object.
   */
  private extractErrorMessage(error: any): string {
    // HTTP errors
    if (error.status) {
      switch (error.status) {
        case 0:
          return 'Unable to connect to the server. Please check your internet connection.';
        case 400:
          return 'Invalid request. Please try again.';
        case 401:
          return 'Authentication required. Please log in.';
        case 403:
          return 'You do not have permission to access this resource.';
        case 404:
          return 'The requested resource was not found.';
        case 429:
          return 'Too many requests. Please wait a moment.';
        case 500:
          return 'An internal server error occurred. Please try again later.';
        case 502:
          return 'The server is temporarily unavailable. Please try again later.';
        case 503:
          return 'The service is temporarily unavailable. Please try again later.';
        default:
          return `An error occurred (Status: ${error.status}). Please try again.`;
      }
    }

    // Generic errors
    if (error.message) {
      return error.message;
    }

    // Fallback
    return 'An unexpected error occurred. Please try again.';
  }
}
