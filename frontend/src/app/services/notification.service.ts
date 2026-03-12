import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { getUserFriendlyMessage, generateErrorKey } from '../shared/utils/error-mapping';

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  notifications = signal<Notification[]>([]);

  // Error deduplication tracking
  private shownErrors = new Map<string, number>();
  private readonly DEBOUNCE_MS = 3000; // 3 seconds debounce window
  private readonly CLEANUP_INTERVAL_MS = 10000; // Clean up every 10 seconds
  private cleanupTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Notification queue for sequential display
  private notificationQueue: Array<{
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    duration?: number;
  }> = [];

  private isProcessingQueue = false;
  private queueTimeoutId: ReturnType<typeof setTimeout> | null = null;

  show(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration = 3000): void {
    const id = Date.now().toString();
    const notification: Notification = { id, message, type, duration };

    this.notifications.update(notifications => [...notifications, notification]);

    // Auto-dismiss after duration
    if (duration) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  /**
   * Show error with deduplication to prevent spam
   * @param error - Error object or string
   * @param duration - Notification duration in ms (default 5000)
   */
  error(error: unknown, duration = 5000): void {
    const errorKey = generateErrorKey(error);
    const now = Date.now();

    // Check if this error was shown recently
    const lastShown = this.shownErrors.get(errorKey);
    if (lastShown && (now - lastShown) < this.DEBOUNCE_MS) {
      // Suppress duplicate - log in dev mode only
      if (typeof environment !== 'undefined' && !environment.production) {
        console.warn('[NotificationService] Suppressed duplicate error:', error);
      }
      return;
    }

    // Update last shown timestamp
    this.shownErrors.set(errorKey, now);

    // Start cleanup timer if not already running
    this.startCleanupTimer();

    // Get user-friendly message
    const userMessage = getUserFriendlyMessage(error);

    // Add to queue for sequential display
    this.notificationQueue.push({ message: userMessage, type: 'error', duration });
    this.processNotificationQueue();
  }

  /**
   * Process notification queue sequentially
   */
  private processNotificationQueue(): void {
    if (this.isProcessingQueue || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    const notification = this.notificationQueue.shift();
    if (notification) {
      this.show(notification.message, notification.type, notification.duration);
    }

    // Clear existing queue timeout
    if (this.queueTimeoutId) {
      clearTimeout(this.queueTimeoutId);
    }

    // Wait for current notification to dismiss before showing next
    this.queueTimeoutId = setTimeout(() => {
      this.isProcessingQueue = false;
      this.queueTimeoutId = null;
      this.processNotificationQueue();
    }, this.notificationQueue.length > 0 ? 5500 : 100);
  }

  /**
   * Start periodic cleanup of old error entries
   */
  private startCleanupTimer(): void {
    // Clear existing timer to prevent multiple timers
    if (this.cleanupTimeoutId) {
      clearTimeout(this.cleanupTimeoutId);
    }

    this.cleanupTimeoutId = setTimeout(() => {
      this.cleanupOldErrors(Date.now());
      this.cleanupTimeoutId = null;
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Clean up error entries older than debounce window
   * @param now - Current timestamp
   */
  private cleanupOldErrors(now: number): void {
    const entriesToDelete: string[] = [];

    this.shownErrors.forEach((timestamp, key) => {
      if (now - timestamp > this.DEBOUNCE_MS) {
        entriesToDelete.push(key);
      }
    });

    entriesToDelete.forEach(key => this.shownErrors.delete(key));
  }

  dismiss(id: string): void {
    this.notifications.update(notifications => notifications.filter(n => n.id !== id));
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }
}
