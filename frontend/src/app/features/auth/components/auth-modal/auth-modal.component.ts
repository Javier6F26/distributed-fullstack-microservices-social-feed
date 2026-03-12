import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegistrationFormComponent } from '../registration-form/registration-form.component';
import { LoginFormComponent } from '../login-form/login-form.component';

export type AuthTab = 'login' | 'register';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, RegistrationFormComponent, LoginFormComponent],
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.scss'],
})
export class AuthModalComponent {
  // Output events
  closeModal = output<void>();
  authSuccess = output<void>();

  // State signals
  activeTab = signal<AuthTab>('login');
  isLoading = signal(false);

  /**
   * Switch to login tab
   */
  switchToLogin(): void {
    this.activeTab.set('login');
  }

  /**
   * Switch to register tab
   */
  switchToRegister(): void {
    this.activeTab.set('register');
  }

  /**
   * Handle close
   */
  onClose(): void {
    this.closeModal.emit();
  }

  /**
   * Handle successful registration
   */
  onRegistrationSuccess(): void {
    this.authSuccess.emit();
  }

  /**
   * Handle successful login
   */
  onLoginSuccess(): void {
    this.authSuccess.emit();
  }

  /**
   * Handle forgot password (placeholder for future story)
   */
  onForgotPassword(): void {
    // Placeholder - will be implemented in future story
  }

  /**
   * Stop event propagation
   */
  onModalClick(event: MouseEvent): void {
    // Prevent closing when clicking inside modal content
    event.stopPropagation();
  }
}
