import { Component, inject, signal, EventEmitter, Output, OnDestroy, Input, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PostService, Post } from '../../../services/post.service';
import { NotificationService } from '../../../services/notification.service';
import { AuthService } from '../../../services/auth.service';
import { PendingWritesNotifyService } from '../../../services/pending-writes-notify.service';
import { Subject } from 'rxjs';

/**
 * Edit Post Modal Component
 * Allows authenticated users to edit their own posts with instant feedback.
 * Features:
 * - Reactive form with validation (title: 5-100 chars, body: 10-5000 chars)
 * - Real-time validation feedback
 * - Optimistic UI update
 * - Tailwind CSS styling
 */
@Component({
  selector: 'app-edit-post-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-post-modal.component.html',
  styleUrls: ['./edit-post-modal.component.scss'],
})
export class EditPostModalComponent implements OnInit, OnChanges, OnDestroy {
  private fb = inject(FormBuilder);
  private postService = inject(PostService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private pendingWritesService = inject(PendingWritesNotifyService);
  private destroy$ = new Subject<void>();

  @Input() post!: Post;
  @Output() postUpdated = new EventEmitter<{ post: Post; postId: string }>();
  @Output() postUpdateFailed = new EventEmitter<{ postId: string }>();
  @Output() modalClosed = new EventEmitter<void>();

  // State
  showModal = signal(true);
  isSubmitting = signal(false);

  // Form
  postForm!: FormGroup;

  /**
   * Initialize reactive form with validators
   * Note: Form is initialized here, but values are set in ngOnInit/ngOnChanges when post input is available
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

  ngOnInit(): void {
    this.initForm();
    // Patch form values after form is initialized
    this.patchFormValues();
  }

  ngOnChanges(): void {
    // If form is already initialized and post changes, patch the new values
    if (this.postForm && this.post) {
      this.patchFormValues();
    }
  }

  /**
   * Patch form values with post data
   */
  private patchFormValues() {
    if (this.post && this.postForm) {
      this.postForm.patchValue({
        title: this.post.title,
        body: this.post.body,
      });
    }
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
    const postId = this.post._id;

    // Create updated post for immediate display
    const updatedPost = {
      ...this.post,
      title,
      body,
      updatedAt: new Date().toISOString(),
    };

    try {
      // Emit updated post immediately for feed to display
      this.postUpdated.emit({ post: updatedPost, postId });

      // Fire-and-forget API call
      this.postService.updatePost(postId, title, body).subscribe({
        next: (response) => {
          if (response?.success) {
            // Start tracking pending write for confirmation (using postId as key)
            this.pendingWritesService.track(postId);
            this.notificationService.success('Post updated successfully!', 3000);
            this.closeModal();
          } else {
            throw new Error('Unexpected response from server');
          }
        },
        error: (error) => {
          // Handle error - emit failure event for feed to rollback
          this.postUpdateFailed.emit({ postId });
          const errorMessage = (error as { error?: { message?: string } })?.error?.message || 'Failed to update post. Please try again.';
          this.notificationService.error(errorMessage);
        },
      });
    } catch (error) {
      // Handle synchronous errors
      this.isSubmitting.set(false);
      this.postUpdateFailed.emit({ postId });
      const errorMessage = (error as { error?: { message?: string } })?.error?.message || 'Failed to update post. Please try again.';
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
