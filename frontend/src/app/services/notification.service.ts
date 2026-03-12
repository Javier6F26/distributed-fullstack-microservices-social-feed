import { Injectable, signal } from '@angular/core';

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

  show(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration = 3000): void {
    const id = Date.now().toString();
    const notification: Notification = { id, message, type, duration };
    
    this.notifications.update(notifications => [...notifications, notification]);
    
    // Auto-dismiss after duration
    if (duration) {
      setTimeout(() => this.dismiss(id), duration);
    }
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

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }
}
