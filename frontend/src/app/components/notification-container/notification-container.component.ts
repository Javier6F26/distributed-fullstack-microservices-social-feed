import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';

@Component({
  selector: 'app-notification-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-container.component.html',
  styleUrls: ['./notification-container.component.scss'],
})
export class NotificationContainerComponent {
  private notificationService = inject(NotificationService);

  get notifications() {
    return this.notificationService.notifications;
  }

  getNotificationClasses(type: Notification['type']): string {
    const baseClasses = 'text-white';
    switch (type) {
      case 'success':
        return `${baseClasses} bg-green-500`;
      case 'warning':
        return `${baseClasses} bg-yellow-500`;
      case 'error':
        return `${baseClasses} bg-red-500`;
      case 'info':
      default:
        return `${baseClasses} bg-blue-500`;
    }
  }

  dismiss(id: string): void {
    this.notificationService.dismiss(id);
  }
}
