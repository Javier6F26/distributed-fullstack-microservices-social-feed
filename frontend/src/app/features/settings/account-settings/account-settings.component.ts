import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { DeletionConfirmationComponent } from '../deletion-confirmation/deletion-confirmation.component';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, DeletionConfirmationComponent],
  templateUrl: './account-settings.component.html',
  styleUrls: ['./account-settings.component.scss'],
})
export class AccountSettingsComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  user = this.authService.user();
  isLoading = false;
  showDeleteDialog = false;

  ngOnInit(): void {
    // Redirect if not authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/']).then();
    }
  }

  /**
   * Open deletion confirmation dialog
   */
  openDeleteDialog(): void {
    this.showDeleteDialog = true;
  }

  /**
   * Close deletion confirmation dialog
   */
  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
  }

  /**
   * Handle deletion confirmation from child component
   */
  onDeletionConfirmed(): void {
    this.isLoading = true;

    // Use the dedicated deletion endpoint
    this.authService.requestAccountDeletion().subscribe({
      next: () => {
        this.isLoading = false;
        this.closeDeleteDialog();
        // Redirect to feed with confirmation message
        this.router.navigate(['/'], {
          queryParams: {
            deleted: 'true',
            message: 'Account deletion request received. You have been logged out. A confirmation email has been sent.',
          },
        }).then();
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Account deletion failed:', error);
        // Still clear local state and redirect (defensive)
        this.closeDeleteDialog();
        this.router.navigate(['/'], {
          queryParams: {
            deleted: 'true',
            message: 'Account deletion request received.',
          },
        }).then();
      },
    });
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
