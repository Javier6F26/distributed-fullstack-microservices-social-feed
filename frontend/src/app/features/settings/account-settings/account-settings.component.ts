import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-settings.component.html',
  styleUrls: ['./account-settings.component.scss'],
})
export class AccountSettingsComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  user = this.authService.user();
  isLoading = false;

  ngOnInit(): void {
    // Redirect if not authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/']).then();
    }
  }

  /**
   * Get username safely
   */
  getUsername(): string {
    return this.user?.username || 'N/A';
  }

  /**
   * Get email safely
   */
  getEmail(): string {
    return this.user?.email || 'N/A';
  }

  /**
   * Get member since date safely
   */
  getMemberSince(): string {
    if (this.user?.createdAt) {
      const date = new Date(this.user.createdAt);
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return 'N/A';
  }
}
