import { Component, Input, OnChanges, OnInit, SimpleChanges, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CommentService, Comment } from '../../../services/comment.service';
import { CommentCardComponent } from '../comment-card/comment-card.component';
import { CommentInputComponent } from '../comment-input/comment-input.component';
import { AuthService } from '../../../services/auth.service';

/**
 * Comment List Component
 * Displays all comments for a post with optimistic UI support.
 * Integrates comment input for creating new comments.
 */
@Component({
  selector: 'app-comment-list',
  standalone: true,
  imports: [CommonModule, RouterModule, CommentCardComponent, CommentInputComponent],
  templateUrl: './comment-list.component.html',
  styleUrls: ['./comment-list.component.scss'],
})
export class CommentListComponent implements OnChanges, OnInit {
  @Input() postId!: string;

  private commentService = inject(CommentService);
  public authService = inject(AuthService);

  // State signals
  comments = signal<Comment[]>([]);
  isLoading = signal(false);

  // Computed display comments (sorted by newest first)
  displayComments = computed(() => {
    return this.comments().sort((a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['postId'] && !changes['postId'].firstChange) {
      this.loadComments();
    }
  }

  ngOnInit(): void {
    if (this.postId) {
      this.loadComments();
    }
  }

  /**
   * Load comments from API
   */
  loadComments() {
    if (!this.postId) return;

    this.isLoading.set(true);

    this.commentService.getPostComments(this.postId).subscribe({
      next: (response) => {
        if (response.success) {
          this.comments.set(response.data || []);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load comments:', error);
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Handle new comment submission (optimistic UI)
   */
  onCommentSubmitted(event: { comment: Comment; tempId: string }) {
    const { comment } = event;

    // Add optimistic comment to the list immediately
    this.comments.update(comments => [comment, ...comments]);
  }

  /**
   * Handle comment submission failure
   */
  onCommentFailed(event: { tempId: string; postId: string }) {
    const { tempId } = event;

    // Remove optimistic comment from the list
    this.comments.update(comments =>
      comments.filter(c => c.tempId !== tempId)
    );
  }

  /**
   * Handle comment delete request (optimistic UI)
   */
  onCommentDeleted(commentId: string) {
    // Optimistic removal - parent stores original for potential rollback
    this.comments.update(comments =>
      comments.filter(c => c._id !== commentId)
    );
  }

  /**
   * Handle comment delete failure (rollback)
   */
  onCommentDeleteFailed(event: { commentId: string; comment: Comment }) {
    const { comment } = event;

    // Rollback - restore the comment
    this.comments.update(comments => [comment, ...comments]);
  }

  /**
   * Handle comment update (optimistic UI)
   */
  onCommentUpdated(event: { commentId: string; body: string }) {
    // Update comment optimistically
    this.comments.update(comments =>
      comments.map(c =>
        c._id === event.commentId
          ? { ...c, body: event.body, updatedAt: new Date().toISOString() }
          : c
      )
    );
  }

  /**
   * Handle comment update failure (rollback)
   */
  onCommentUpdateFailed(event: { commentId: string; originalComment: Comment }) {
    // Rollback - restore original comment
    this.comments.update(comments =>
      comments.map(c =>
        c._id === event.commentId ? event.originalComment : c
      )
    );
  }

  /**
   * Track by function for ngFor
   */
  trackByComment(index: number, comment: Comment): string {
    return comment.tempId || comment._id || index.toString();
  }
}
