import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Delete Confirmation Dialog Component
 * Reusable modal for confirming destructive actions.
 * Note: Currently using native browser confirm() instead.
 * This component is kept for potential future custom modal implementation.
 */
@Component({
  selector: 'app-delete-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delete-confirmation-dialog.component.html',
  styleUrls: ['./delete-confirmation-dialog.component.scss'],
})
export class DeleteConfirmationDialogComponent {
  @Input() message: string = 'Are you sure you want to delete this? This action cannot be undone.';
  @Input() title: string = 'Confirm Delete';

  // Note: This component is not currently used - using native confirm() instead
  // To use this component, implement a custom modal service without ng-bootstrap
}
