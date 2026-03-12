import { Component, inject, signal, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { CommentService, Comment } from '../../../services/comment.service';
import { NotificationService } from '../../../services/notification.service';

/**
 * Comment Input Component
 * Allows authenticated users to create comments with instant feedback.
 * Features:
 * - Reactive form with validation (body: 1-1000 chars)
 * - Real-time character counter
 * - Optimistic UI update with actual API call
 * - Minimalist & Instantaneous theme styling
 */
@Component({
  selector: 'app-comment-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './comment-input.component.html',
  styleUrls: ['./comment-input.component.scss'],
})
export class CommentInputComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private commentService = inject(CommentService);
  private notificationService = inject(NotificationService);

  @Input() postId!: string;
  @Output() commentSubmitted = new EventEmitter<{ comment: Comment; tempId: string }>();
  @Output() commentFailed = new EventEmitter<{ tempId: string; postId: string }>();

  // State
  isSubmitting = signal(false);

  // Form
  commentForm!: FormGroup;

  ngOnInit(): void {
    this.initForm();
  }

  /**
   * Initialize reactive form with validators
   */
  private initForm() {
    this.commentForm = this.fb.group({
      body: [
        '',
        [
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(1000),
        ],
      ],
    });
  }

  /**
   * Get form controls for template access
   */
  get body() {
    return this.commentForm.get('body');
  }

  /**
   * Auto-resize textarea based on content
   */
  autoResize(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  /**
   * Handle form submission with optimistic UI and actual API call
   */
  async onSubmit() {
    if (this.commentForm.invalid || !this.postId || !this.authService.isAuthenticated()) {
      return;
    }

    this.isSubmitting.set(true);

    const { body } = this.commentForm.value;

    // Generate tempId for optimistic UI correlation
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get current user info
    const user = this.authService.getCurrentUser();

    // Create optimistic comment for immediate display
    const optimisticComment = {
      tempId,
      postId: this.postId,
      body: body,
      text: body,
      author: user?.username || 'Anonymous',
      authorUsername: user?.username || 'Anonymous',
      userId: user?._id,
      createdAt: new Date().toISOString(),
      pending: true, // Mark as pending sync
      likes: 0,
      isEdited: false,
      deleted: false,
    };

    try {
      // Emit optimistic comment immediately for parent to display
      this.commentSubmitted.emit({ comment: optimisticComment as unknown as Comment, tempId });

      // Make actual API call to create comment
      this.commentService.createComment(this.postId, body).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Server confirmed - update with real data if needed
            // The optimistic comment is already displayed, just mark as confirmed
            this.notificationService.success('Comment added successfully');

            // Clear input field on successful submission
            this.commentForm.reset();

            // Reset textarea height
            const textarea = document.querySelector('.comment-textarea') as HTMLTextAreaElement;
            if (textarea) {
              textarea.style.height = 'auto';
            }
          } else {
            // API returned error response
            this.handleApiError(response.errors?.[0]?.message || 'Failed to post comment');
          }
        },
        error: (error) => {
          // API call failed (network error, server error, etc.)
          console.error('Comment creation failed:', error);
          this.handleApiError('Failed to post comment. Please try again.');
        },
        complete: () => {
          this.isSubmitting.set(false);
        },
      });
    } catch (error) {
      // Handle synchronous error
      console.error('Comment submission error:', error);
      this.handleApiError((error as Error)?.message || 'Failed to post comment');
      this.isSubmitting.set(false);
    }
  }

  /**
   * Handle API error - emit failure event for parent to remove optimistic comment
   */
  private handleApiError(errorMessage: string) {
    this.notificationService.error(errorMessage);
    this.commentFailed.emit({ tempId: this.commentForm.value.body ? `temp_${Date.now()}` : 'unknown', postId: this.postId });
  }
}
