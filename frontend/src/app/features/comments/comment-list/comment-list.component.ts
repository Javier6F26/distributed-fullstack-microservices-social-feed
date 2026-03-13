import { Component, Input, OnChanges, OnInit, OnDestroy, SimpleChanges, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CommentService, Comment } from '../../../services/comment.service';
import { CommentCardComponent } from '../comment-card/comment-card.component';
import { CommentInputComponent } from '../comment-input/comment-input.component';
import { AuthService } from '../../../services/auth.service';
import { PendingWritesNotifyService } from '../../../services/pending-writes-notify.service';
import { Subscription } from 'rxjs';

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
export class CommentListComponent implements OnChanges, OnInit, OnDestroy {
  @Input() postId!: string;

  private commentService = inject(CommentService);
  public authService = inject(AuthService);
  private pendingWritesService = inject(PendingWritesNotifyService);

  // State signals
  comments = signal<Comment[]>([]);
  isLoading = signal(false);
  failedComments = signal<Set<string>>(new Set()); // Track failed tempIds for retry state
  private confirmedSubscription?: Subscription;

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
    // Subscribe to pending write errors
    this.pendingWritesService.errors$.subscribe((errors) => {
      this.failedComments.set(new Set(errors.map(e => e.tempId)));
    });
    // Subscribe to confirmations to clear pending flag
    this.confirmedSubscription = this.pendingWritesService.confirmed$.subscribe(({ tempId, postId }) => {
      this.clearPendingFlag(tempId, postId);
    });
    // Check for already-confirmed comments (race condition fix)
    this.comments().forEach(comment => {
      const tempId = comment.tempId || comment._id;
      if (this.pendingWritesService.isConfirmed(tempId) && comment.pending) {
        this.clearPendingFlag(tempId);
        this.pendingWritesService.clearConfirmed(tempId);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.confirmedSubscription) {
      this.confirmedSubscription.unsubscribe();
    }
  }

  /**
   * Clear pending flag on a comment when confirmed
   * Also replaces tempId-based _id with real commentId when available
   */
  private clearPendingFlag(tempId: string, commentId?: string): void {
    this.comments.update(comments =>
      comments.map(comment => {
        const matchId = comment.tempId || comment._id;
        if (matchId === tempId) {
          return { ...comment, pending: false, _id: commentId || comment._id };
        }
        return comment;
      })
    );
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
  onCommentSubmitted(event: { comment: Comment; tempId: string; isUpdate?: boolean }) {
    const { comment } = event;

    // Check if already confirmed (race condition)
    if (this.pendingWritesService.isConfirmed(event.tempId)) {
      comment.pending = false;
      this.pendingWritesService.clearConfirmed(event.tempId);
    }

    if (event.isUpdate) {
      // Replace optimistic comment with real comment data from API
      // Preserve tempId for clearPendingFlag to work correctly
      this.comments.update(comments =>
        comments.map(c =>
          c.tempId === event.tempId
            ? { ...event.comment, pending: true, tempId: event.tempId } // Keep pending: true until confirmed, preserve tempId
            : c
        )
      );
    } else {
      // Add optimistic comment to the list immediately
      this.comments.update(comments => [comment, ...comments]);
    }
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

  /**
   * Check if a comment has a failed write (shows retry state)
   */
  hasFailedWrite(comment: Comment): boolean {
    const tempId = comment.tempId || comment._id;
    return this.failedComments().has(tempId);
  }

  /**
   * Get error message for a failed comment
   */
  getFailedWriteError(comment: Comment): string | undefined {
    const tempId = comment.tempId || comment._id;
    return this.pendingWritesService.getError(tempId);
  }

  /**
   * Handle retry for a failed comment - re-open input with pre-filled text
   */
  onRetryComment(comment: Comment): void {
    const tempId = comment.tempId || comment._id;
    
    // Clear the error state
    this.pendingWritesService.removeError(tempId);
    this.failedComments.update(set => {
      const newSet = new Set(set);
      newSet.delete(tempId);
      return newSet;
    });

    // Remove the failed comment from the list
    this.comments.update(comments =>
      comments.filter(c => c.tempId !== tempId && c._id !== tempId)
    );

    // Notify user to re-submit
    // In a full implementation, you'd pre-fill the comment input with the comment body
  }
}
