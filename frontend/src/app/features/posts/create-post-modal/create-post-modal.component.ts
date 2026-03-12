import { Component, inject, signal, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PostService, Post } from '../../../services/post.service';
import { NotificationService } from '../../../services/notification.service';
import { AuthService } from '../../../services/auth.service';

/**
 * Create Post Modal Component
 * Allows authenticated users to create new posts with instant feedback.
 * Features:
 * - Reactive form with validation (title: 5-100 chars, body: 10-5000 chars)
 * - Real-time validation feedback
 * - Optimistic UI update
 * - Minimalist & Instantaneous theme styling
 * - Fade animations
 */
@Component({
  selector: 'app-create-post-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-post-modal.component.html',
  styleUrls: ['./create-post-modal.component.scss'],
})
export class CreatePostModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private postService = inject(PostService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);

  @Output() postCreated = new EventEmitter<{ post: Post; tempId: string }>();
  @Output() postFailed = new EventEmitter<{ tempId: string }>();
  @Output() modalClosed = new EventEmitter<void>();

  // State
  showModal = signal(true);
  isSubmitting = signal(false);

  // Form
  postForm!: FormGroup;

  ngOnInit(): void {
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
   */
  async onSubmit() {
    if (this.postForm.invalid || !this.authService.isAuthenticated()) {
      return;
    }

    this.isSubmitting.set(true);

    const { title, body } = this.postForm.value;

    // Generate tempId for optimistic UI correlation
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create optimistic post for immediate display
    const optimisticPost = {
      tempId,
      title,
      content: body,
      author: 'You',
      createdAt: new Date().toISOString(),
      pending: true, // Mark as pending sync
      commentCount: 0,
    };

    try {
      // Emit optimistic post immediately for feed to display
      this.postCreated.emit({ post: optimisticPost as unknown as Post, tempId });

      // Call post service to create post
      const response = await this.postService.createPost(title, body).toPromise();

      if (response?.success) {
        // Show success notification
        this.notificationService.success('Post created successfully!');
      }

      // Close modal
      this.closeModal();
    } catch (error) {
      // Handle error - emit failure event for feed to remove optimistic post
      this.postFailed.emit({ tempId });

      // Show error notification
      const errorMessage = (error as { error?: { message?: string } })?.error?.message || 'Failed to create post. Please try again.';
      this.notificationService.error(errorMessage);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Close modal
   */
  closeModal() {
    this.showModal.set(false);
    this.modalClosed.emit();
  }
}
