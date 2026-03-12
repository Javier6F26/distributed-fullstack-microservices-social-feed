import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './user-menu.component.html',
  styleUrls: ['./user-menu.component.scss'],
})
export class UserMenuComponent {
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  // Menu state
  isMenuOpen = signal(false);
  isLoggingOut = signal(false);

  // User data from auth service
  user = computed(() => this.authService.user());
  isAuthenticated = computed(() => this.authService.isAuthenticated());

  /**
   * Toggle menu visibility
   */
  toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  /**
   * Close menu
   */
  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  /**
   * Handle logout
   */
  async onLogout(): Promise<void> {
    this.isLoggingOut.set(true);

    try {
      // Call logout and subscribe to complete the request
      this.authService.logout().subscribe({
        next: () => {
          this.isLoggingOut.set(false);
          this.closeMenu();
          // Show success notification
          this.notificationService.success('Logged out successfully');
          // Redirect to feed view
          this.router.navigate(['/']);
        },
        error: (error) => {
          this.isLoggingOut.set(false);
          console.error('Logout failed:', error);
          // Still clear local state and redirect (defensive logout)
          this.closeMenu();
          this.notificationService.error('Logout failed, please try again');
          this.router.navigate(['/']);
        },
      });
    } catch (error) {
      this.isLoggingOut.set(false);
      console.error('Logout error:', error);
      // Defensive logout - clear state and redirect anyway
      this.closeMenu();
      this.notificationService.error('Logout error');
      await this.router.navigate(['/']);
    }
  }

  /**
   * Get user initials for avatar fallback
   */
  getUserInitials(): string {
    const user = this.user();
    if (!user) {
      return '';
    }

    const username = user.username || '';
    const parts = username.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
  }
}
