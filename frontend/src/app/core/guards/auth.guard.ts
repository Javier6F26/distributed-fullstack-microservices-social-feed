import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

/**
 * Guard to protect routes that require authentication
 * Redirects unauthenticated users to home page
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to home if not authenticated
  router.navigate(['/']);
  return false;
};
