import { Component, inject, signal, EventEmitter, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PostService, Post } from '../../../services/post.service';
import { NotificationService } from '../../../services/notification.service';
import { AuthService } from '../../../services/auth.service';
import { PendingWritesNotifyService } from '../../../services/pending-writes-notify.service';
import { Subject } from 'rxjs';

/**
 * Create Post Modal Component
 * Allows authenticated users to create new posts with instant feedback.
 * Features:
 * - Reactive form with validation (title: 5-100 chars, body: 10-5000 chars)
 * - Real-time validation feedback
 * - Optimistic UI update
 * - Tailwind CSS styling
 */
@Component({
  selector: 'app-create-post-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-post-modal.component.html',
  styleUrls: ['./create-post-modal.component.scss'],
})
export class CreatePostModalComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private postService = inject(PostService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private pendingWritesService = inject(PendingWritesNotifyService);
  private destroy$ = new Subject<void>();

  @Output() postCreated = new EventEmitter<{ post: Post; tempId: string; isUpdate?: boolean }>();
  @Output() postFailed = new EventEmitter<{ tempId: string }>();
  @Output() modalClosed = new EventEmitter<void>();

  // State
  showModal = signal(true);
  isSubmitting = signal(false);

  // Form
  postForm!: FormGroup;

  constructor() {
    this.initForm();
  }

  /**
   * Initialize reactive form with validators
   */
  private initForm() {
    this.postForm = this.fb.group({
      title: [
        '',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(100),
        ],
      ],
      body: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(5000),
        ],
      ],
    });
  }

  /**
   * Get form controls for template access
   */
  get title() {
    return this.postForm.get('title');
  }

  get body() {
    return this.postForm.get('body');
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
   * Handle form submission with optimistic UI
   * CRITICAL: Clear isSubmitting immediately after emit - message is enqueued
   */
  async onSubmit() {
    if (this.postForm.invalid || !this.authService.isAuthenticated()) {
      return;
    }

    // Prevent double submission
    if (this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);

    const { title, body } = this.postForm.value;

    // Generate tempId for optimistic UI correlation
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get current user info
    const user = this.authService.getCurrentUser();

    // Create optimistic post for immediate display
    const optimisticPost = {
      _id: tempId, // Use tempId as _id until real ID is assigned
      tempId,
      authorId: user?._id || '',
      author: user?.username || 'You',
      title,
      content: body,
      body: body, // Also include body for Post interface compatibility
      createdAt: new Date().toISOString(),
      pending: true, // Mark as pending sync
      commentCount: 0,
    };

    try {
      // Emit optimistic post immediately for feed to display
      this.postCreated.emit({ post: optimisticPost as unknown as Post, tempId });

      // CRITICAL: Clear loading state IMMEDIATELY - message is enqueued
      // No need to wait for API response with optimistic UI
      this.isSubmitting.set(false);

      // Fire-and-forget API call - handle success/error in subscription
      this.postService.createPost(title, body, tempId).subscribe({
        next: (response) => {
          if (response?.success && response.data) {
            // Start tracking pending write for confirmation
            this.pendingWritesService.track(tempId);
            // Emit the real post data to replace the optimistic one
            // Type assertion needed because API response may not include all Post fields
            this.postCreated.emit({ post: response.data as unknown as Post, tempId, isUpdate: true });
            this.closeModal();
          } else {
            // Handle unexpected response
            throw new Error('Unexpected response from server');
          }
        },
        error: (error) => {
          // Handle error - emit failure event for feed to remove optimistic post
          this.postFailed.emit({ tempId });
          const errorMessage = (error as { error?: { message?: string } })?.error?.message || 'Failed to create post. Please try again.';
          this.notificationService.error(errorMessage);
        },
      });
    } catch (error) {
      // Handle synchronous errors
      this.isSubmitting.set(false);
      this.postFailed.emit({ tempId });
      const errorMessage = (error as { error?: { message?: string } })?.error?.message || 'Failed to create post. Please try again.';
      this.notificationService.error(errorMessage);
    }
  }

  /**
   * Close modal and cleanup
   */
  closeModal() {
    this.showModal.set(false);
    this.modalClosed.emit();
  }

  /**
   * Cleanup subscriptions on destroy
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
