import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Comment } from '../../../services/comment.service';
import { AuthService } from '../../../services/auth.service';
import { CommentService } from '../../../services/comment.service';
import { NotificationService } from '../../../services/notification.service';

/**
 * Comment Card Component
 * Displays a single comment with author, timestamp, and content.
 * Supports optimistic UI state (pending sync).
 */
@Component({
  selector: 'app-comment-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comment-card.component.html',
  styleUrls: ['./comment-card.component.scss'],
})
export class CommentCardComponent {
  @Input() comment!: Comment;
  @Output() commentDeleted = new EventEmitter<string>();
  @Output() commentDeleteFailed = new EventEmitter<{ commentId: string; comment: Comment }>();

  // State
  isDeleting = signal(false);

  // Inject services
  private authService = inject(AuthService);
  private commentService = inject(CommentService);
  private notificationService = inject(NotificationService);

  /**
   * Check if current user can delete the comment
   */
  canDeleteComment(): boolean {
    const currentUser = this.authService.getCurrentUser();
    // Check if comment has authorId field (from API)
    return currentUser?._id === this.comment.authorId;
  }

  /**
   * Handle delete comment click
   */
  onDeleteComment(): void {
    // Use native browser confirm dialog instead of modal library
    const confirmed = confirm('Are you sure you want to delete this comment? This action cannot be undone.');
    if (confirmed) {
      this.confirmDeleteComment();
    }
  }

  /**
   * Confirm delete comment with optimistic UI
   */
  private confirmDeleteComment(): void {
    // Set deleting state
    this.isDeleting.set(true);

    // Emit event for parent to remove from list optimistically
    this.commentDeleted.emit(this.comment._id);

    this.commentService.deleteComment(this.comment._id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.notificationService.success('Comment deleted successfully');
      },
      error: (error) => {
        this.isDeleting.set(false);
        console.error('Failed to delete comment:', error);
        this.notificationService.error('Failed to delete comment. Please try again.');
        // Emit failure event for parent to rollback
        this.commentDeleteFailed.emit({ commentId: this.comment._id, comment: this.comment });
      },
    });
  }

  /**
   * Get relative time string from ISO date
   */
  getRelativeTime(dateString: string | undefined): string {
    if (!dateString) {
      return '';
    }
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Check if comment has been edited
   */
  isEdited(comment: Comment): boolean {
    if (!comment.updatedAt || !comment.createdAt) {
      return false;
    }
    return new Date(comment.updatedAt) > new Date(comment.createdAt);
  }
}
