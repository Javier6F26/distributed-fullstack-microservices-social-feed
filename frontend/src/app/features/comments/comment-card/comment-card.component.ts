import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Comment } from '../../../services/comment.service';

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
}
