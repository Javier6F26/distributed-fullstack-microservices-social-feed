import { Component, signal, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-registration-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registration-form.component.html',
  styleUrls: ['./registration-form.component.scss'],
})
export class RegistrationFormComponent {
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  // Output events
  registrationSuccess = output<void>();
  switchToLogin = output<void>();

  // Form state signals
  username = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  isLoading = signal(false);
  showPassword = signal(false);

  // Validation errors
  errors = signal<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  // Password strength
  passwordStrength = signal<number>(0);
  passwordRequirements = signal({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  /**
   * Validate username
   */
  validateUsername(): void {
    const username = this.username().trim();
    
    if (!username) {
      this.errors.update(e => ({ ...e, username: 'Username is required' }));
    } else if (username.length < 3) {
      this.errors.update(e => ({ ...e, username: 'Username must be at least 3 characters' }));
    } else if (username.length > 30) {
      this.errors.update(e => ({ ...e, username: 'Username cannot exceed 30 characters' }));
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      this.errors.update(e => ({ ...e, username: 'Username can only contain letters, numbers, and underscores' }));
    } else {
      this.errors.update(e => ({ ...e, username: undefined }));
    }
  }

  /**
   * Validate email
   */
  validateEmail(): void {
    const email = this.email().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
      this.errors.update(e => ({ ...e, email: 'Email is required' }));
    } else if (!emailRegex.test(email)) {
      this.errors.update(e => ({ ...e, email: 'Please enter a valid email address' }));
    } else {
      this.errors.update(e => ({ ...e, email: undefined }));
    }
  }

  /**
   * Validate password and update strength
   */
  validatePassword(): void {
    const password = this.password();
    const requirements = {
      hasMinLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[@$!%*?&]/.test(password),
    };

    this.passwordRequirements.set(requirements);

    // Calculate strength (0-4)
    const strength = Object.values(requirements).filter(Boolean).length - 1;
    this.passwordStrength.set(Math.max(0, Math.min(4, strength)));

    // Validate
    if (!password) {
      this.errors.update(e => ({ ...e, password: 'Password is required' }));
    } else if (!requirements.hasMinLength) {
      this.errors.update(e => ({ ...e, password: 'Password must be at least 8 characters' }));
    } else if (!requirements.hasUppercase || !requirements.hasLowercase || !requirements.hasNumber || !requirements.hasSpecialChar) {
      this.errors.update(e => ({ ...e, password: 'Password must contain uppercase, lowercase, number, and special character' }));
    } else {
      this.errors.update(e => ({ ...e, password: undefined }));
    }

    // Re-validate confirm password if it has a value
    if (this.confirmPassword()) {
      this.validateConfirmPassword();
    }
  }

  /**
   * Validate confirm password
   */
  validateConfirmPassword(): void {
    if (this.password() !== this.confirmPassword()) {
      this.errors.update(e => ({ ...e, confirmPassword: 'Passwords do not match' }));
    } else {
      this.errors.update(e => ({ ...e, confirmPassword: undefined }));
    }
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    // Validate all fields
    this.validateUsername();
    this.validateEmail();
    this.validatePassword();
    this.validateConfirmPassword();

    // Check if there are any errors
    const currentErrors = this.errors();
    if (currentErrors.username || currentErrors.email || currentErrors.password || currentErrors.confirmPassword) {
      return;
    }

    this.isLoading.set(true);

    this.authService.register({
      username: this.username().trim(),
      email: this.email().trim(),
      password: this.password(),
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.notificationService.success('Registration successful! Welcome aboard!', 3000);
        this.registrationSuccess.emit();
      },
      error: (error) => {
        this.isLoading.set(false);
        const message = error.error?.message || 'Registration failed. Please try again.';
        this.errors.update(e => ({ ...e, general: message }));
        this.notificationService.error(message, 5000);
      },
    });
  }

  /**
   * Clear form
   */
  clearForm(): void {
    this.username.set('');
    this.email.set('');
    this.password.set('');
    this.confirmPassword.set('');
    this.errors.set({});
    this.passwordStrength.set(0);
  }

  /**
   * Get password strength color
   */
  getPasswordStrengthColor(): string {
    const strength = this.passwordStrength();
    const colors = ['#e0e0e0', '#f44336', '#ff9800', '#ffeb3b', '#4caf50'];
    return colors[strength] || '#e0e0e0';
  }

  /**
   * Get password strength label
   */
  getPasswordStrengthLabel(): string {
    const strength = this.passwordStrength();
    const labels = ['Enter password', 'Weak', 'Fair', 'Good', 'Strong'];
    return labels[strength] || 'Enter password';
  }
}
