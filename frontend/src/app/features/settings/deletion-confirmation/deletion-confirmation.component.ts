import { Component, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-deletion-confirmation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deletion-confirmation.component.html',
  styleUrls: ['./deletion-confirmation.component.scss'],
})
export class DeletionConfirmationComponent {
  private authService = inject(AuthService);
  
  confirmed = output<void>();
  cancelled = output<void>();
  
  userEmail = computed(() => {
    const email = this.authService.user()?.email;
    return email || 'your registered email';
  });

  /**
   * Emit confirm event
   */
  onConfirm(): void {
    this.confirmed.emit();
  }

  /**
   * Emit cancel event
   */
  onCancel(): void {
    this.cancelled.emit();
  }
}
