import { Component, inject, signal, EventEmitter, Output, Input, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { CommentService, Comment } from '../../../services/comment.service';
import { NotificationService } from '../../../services/notification.service';
import { PendingWritesNotifyService } from '../../../services/pending-writes-notify.service';

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
  private pendingWritesService = inject(PendingWritesNotifyService);

  @Input() postId!: string;
  @Output() commentSubmitted = new EventEmitter<{ comment: Comment; tempId: string; isUpdate?: boolean }>();
  @Output() commentFailed = new EventEmitter<{ tempId: string; postId: string }>();

  // Template reference
  @ViewChild('commentTextarea') commentTextarea!: ElementRef<HTMLTextAreaElement>;

  // State
  isSubmitting = signal(false);
  private currentTempId: string | null = null;

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
          this.trimValidator, // Custom validator to prevent whitespace-only
        ],
      ],
    });
  }

  /**
   * Custom validator to trim and check for empty value
   */
  private trimValidator(control: any) {
    if (control.value && typeof control.value === 'string') {
      const trimmed = control.value.trim();
      if (trimmed.length === 0) {
        return { 'whitespace': true };
      }
    }
    return null;
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
   * CRITICAL: Clear isSubmitting immediately after emit - message is enqueued
   */
  async onSubmit() {
    if (this.commentForm.invalid || !this.postId || !this.authService.isAuthenticated()) {
      return;
    }

    this.isSubmitting.set(true);

    // Disable form while submitting
    this.commentForm.disable();

    const { body } = this.commentForm.value;

    // Generate tempId for optimistic UI correlation
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.currentTempId = tempId;

    // Get current user info
    const user = this.authService.getCurrentUser();

    // Create optimistic comment for immediate display
    const optimisticComment: Comment = {
      _id: tempId, // Use tempId as _id until real ID is assigned
      tempId,
      postId: this.postId,
      authorId: user?._id || '',
      name: user?.username || 'Anonymous',
      email: user?.email || '',
      body: body,
      createdAt: new Date().toISOString(),
      pending: true, // Mark as pending sync
    };

    try {
      // Emit optimistic comment immediately for parent to display
      this.commentSubmitted.emit({ comment: optimisticComment as unknown as Comment, tempId });

      // CRITICAL: Clear loading state IMMEDIATELY - message is enqueued
      // No need to wait for API response with optimistic UI
      this.isSubmitting.set(false);

      // Fire-and-forget API call - handle success/error in subscription
      this.commentService.createComment(this.postId, body).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Start tracking pending write for confirmation
            this.pendingWritesService.track(tempId);
            // Emit the real comment data to replace the optimistic one
            this.commentSubmitted.emit({ comment: response.data as unknown as Comment, tempId, isUpdate: true });

            // Clear input field on successful submission
            this.commentForm.reset();
            this.commentForm.enable();

            // Reset textarea height using ViewChild reference
            if (this.commentTextarea) {
              this.commentTextarea.nativeElement.style.height = 'auto';
            }
          } else {
            // API returned error response
            this.commentForm.enable();
            this.handleApiError(response.errors?.[0]?.message || 'Failed to post comment');
          }
        },
        error: (error) => {
          // API call failed (network error, server error, etc.)
          console.error('Comment creation failed:', error);
          this.commentForm.enable();
          this.handleApiError('Failed to post comment. Please try again.');
        },
        // No complete callback - state already cleared above
      });
    } catch (error) {
      // Handle synchronous error
      console.error('Comment submission error:', error);
      this.commentForm.enable();
      this.isSubmitting.set(false);
      this.handleApiError((error as Error)?.message || 'Failed to post comment');
    }
  }

  /**
   * Handle API error - emit failure event for parent to remove optimistic comment
   */
  private handleApiError(errorMessage: string) {
    this.notificationService.error(errorMessage);
    this.commentFailed.emit({ tempId: this.currentTempId || 'unknown', postId: this.postId });
  }
}
