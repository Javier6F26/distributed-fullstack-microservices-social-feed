import { Component, signal, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.scss'],
})
export class LoginFormComponent {
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  // Output events
  loginSuccess = output<void>();
  loginSuccessWithPendingAction = output<() => void>(); // Emit callback to complete pending action
  switchToRegister = output<void>();
  forgotPassword = output<void>();

  // Form state signals
  identifier = signal(''); // Can be email or username
  password = signal('');
  rememberMe = signal(false);
  isLoading = signal(false);
  showPassword = signal(false);

  // Validation errors
  errors = signal<{
    identifier?: string;
    password?: string;
    general?: string;
  }>({});

  /**
   * Validate identifier (email/username)
   */
  validateIdentifier(): void {
    const identifier = this.identifier().trim();
    
    if (!identifier) {
      this.errors.update(e => ({ ...e, identifier: 'Email or username is required' }));
    } else if (identifier.length < 3) {
      this.errors.update(e => ({ ...e, identifier: 'Please enter a valid email or username' }));
    } else {
      this.errors.update(e => ({ ...e, identifier: undefined }));
    }
  }

  /**
   * Validate password
   */
  validatePassword(): void {
    if (!this.password()) {
      this.errors.update(e => ({ ...e, password: 'Password is required' }));
    } else {
      this.errors.update(e => ({ ...e, password: undefined }));
    }
  }

  /**
   * Handle form submission
   */
  onSubmit(pendingActionCallback?: () => void): void {
    // Validate fields
    this.validateIdentifier();
    this.validatePassword();

    // Check if there are any errors
    const currentErrors = this.errors();
    if (currentErrors.identifier || currentErrors.password) {
      return;
    }

    this.isLoading.set(true);

    this.authService.login({
      identifier: this.identifier().trim(),
      password: this.password(),
      rememberMe: this.rememberMe(),
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        
        // Only show toast if there's no pending action (pending action will show its own toast)
        if (!pendingActionCallback) {
          this.notificationService.success('Welcome back!', 3000);
          this.loginSuccess.emit();
        } else {
          // Let the parent handle the toast for pending actions
          this.loginSuccessWithPendingAction.emit(pendingActionCallback);
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        const message = error.error?.message || 'Login failed. Please check your credentials.';
        this.errors.update(e => ({ ...e, general: message }));
        this.notificationService.error(message, 5000);
      },
    });
  }

  /**
   * Clear form
   */
  clearForm(): void {
    this.identifier.set('');
    this.password.set('');
    this.errors.set({});
  }
}
