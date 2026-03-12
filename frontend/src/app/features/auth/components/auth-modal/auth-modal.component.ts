import { Component, signal, output, OnInit } from '@angular/core';
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
export class AuthModalComponent implements OnInit {
  // Output events
  closeModal = output<void>();
  authSuccess = output<void>();

  // State signals
  activeTab = signal<AuthTab>('login');
  isLoading = signal(false);

  ngOnInit(): void {
    console.log('[AuthModalComponent] ngOnInit - AuthModal initialized');
  }

  /**
   * Switch to login tab
   */
  switchToLogin(): void {
    console.log('[AuthModalComponent] switchToLogin called');
    this.activeTab.set('login');
  }

  /**
   * Switch to register tab
   */
  switchToRegister(): void {
    console.log('[AuthModalComponent] switchToRegister called');
    this.activeTab.set('register');
  }

  /**
   * Handle close
   */
  onClose(): void {
    console.log('[AuthModalComponent] onClose called');
    this.closeModal.emit();
  }

  /**
   * Handle successful registration
   */
  onRegistrationSuccess(): void {
    // Auto-switch to login or close modal
    // For better UX, we'll keep them logged in after registration
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
    console.log('Forgot password clicked - to be implemented');
  }

  /**
   * Stop event propagation
   */
  onModalClick(event: MouseEvent): void {
    // Prevent closing when clicking inside modal content
    event.stopPropagation();
  }
}
