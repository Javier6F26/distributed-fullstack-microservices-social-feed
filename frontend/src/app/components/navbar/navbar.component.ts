import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {
  authService = inject(AuthService);
  private router = inject(Router);
  @Output() loginClicked = new EventEmitter<void>();

  openLoginModal(): void {
    console.log('[NavbarComponent] openLoginModal called');
    console.log('[NavbarComponent] Emitting loginClicked event');
    this.loginClicked.emit();
    console.log('[NavbarComponent] loginClicked event emitted');
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/']).then();
      },
      error: (error) => {
        console.error('Logout failed:', error);
        this.router.navigate(['/']).then();
      },
    });
  }
}
