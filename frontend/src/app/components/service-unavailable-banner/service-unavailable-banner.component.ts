import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Service Unavailable Banner Component
 * Displays a user-friendly banner when a service is temporarily unavailable.
 */
@Component({
  selector: 'app-service-unavailable-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './service-unavailable-banner.component.html',
  styleUrls: ['./service-unavailable-banner.component.scss'],
})
export class ServiceUnavailableBannerComponent {
  @Input() isVisible = true;
  @Input() message = 'This service is temporarily unavailable. Please try again later.';
  @Input() bannerType: 'error' | 'warning' = 'warning';
  @Input() dismissible = true;

  dismiss(): void {
    this.isVisible = false;
  }
}
