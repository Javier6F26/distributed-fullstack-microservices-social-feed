import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuardService {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(): boolean | UrlTree {
    if (this.authService.isAuthenticated()) {
      return true;
    }

    // Redirect to current page with auth modal trigger
    // Store the attempted URL for redirect after login
    const currentUrl = this.router.routerState.snapshot.url;
    sessionStorage.setItem('redirect_url', currentUrl);
    
    // Navigate to home with auth modal trigger
    return this.router.createUrlTree(['/'], {
      queryParams: { auth: 'required' },
    });
  }
}

// Functional guard for use in routes
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Store the attempted URL for redirect after login
  const currentUrl = router.routerState.snapshot.url;
  sessionStorage.setItem('redirect_url', currentUrl);
  
  // Navigate to home with auth modal trigger
  return router.createUrlTree(['/'], {
    queryParams: { auth: 'required' },
  });
};
