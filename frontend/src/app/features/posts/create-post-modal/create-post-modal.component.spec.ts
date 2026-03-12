import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CreatePostModalComponent } from './create-post-modal.component';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PostService } from '../../../services/post.service';
import { NotificationService } from '../../../services/notification.service';
import { AuthService } from '../../../services/auth.service';
import { of, throwError } from 'rxjs';

describe('CreatePostModalComponent', () => {
  let component: CreatePostModalComponent;
  let fixture: ComponentFixture<CreatePostModalComponent>;
  let postService: jest.Mocked<PostService>;
  let notificationService: jest.Mocked<NotificationService>;
  let authService: jest.Mocked<AuthService>;

  const mockPostService = {
    createPost: jest.fn(),
    removeOptimisticPost: jest.fn(),
  };

  const mockNotificationService = {
    success: jest.fn(),
    error: jest.fn(),
    show: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    dismiss: jest.fn(),
    notifications: { update: jest.fn() },
  };

  const mockAuthService = {
    isAuthenticated: jest.fn(),
    isAuthenticatedUser: jest.fn(),
    getCurrentUser: jest.fn(),
    getAccessToken: jest.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, CreatePostModalComponent],
      providers: [
        FormBuilder,
        { provide: PostService, useValue: mockPostService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreatePostModalComponent);
    component = fixture.componentInstance;
    postService = TestBed.inject(PostService) as jest.Mocked<PostService>;
    notificationService = TestBed.inject(NotificationService) as jest.Mocked<NotificationService>;
    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      authService.isAuthenticated.mockReturnValue(true);
      component.postForm.setValue({ title: 'Test Title', body: 'This is a test post body' });
    });

    it('should not submit if form is invalid', fakeAsync(() => {
      // Arrange
      component.postForm.setValue({ title: '', body: '' });
      const emitSpy = jest.spyOn(component.postCreated, 'emit');

      // Act
      component.onSubmit();
      tick();

      // Assert
      expect(emitSpy).not.toHaveBeenCalled();
      expect(postService.createPost).not.toHaveBeenCalled();
    }));

    it('should not submit if user is not authenticated', fakeAsync(() => {
      // Arrange
      authService.isAuthenticated.mockReturnValue(false);
      const emitSpy = jest.spyOn(component.postCreated, 'emit');

      // Act
      component.onSubmit();
      tick();

      // Assert
      expect(emitSpy).not.toHaveBeenCalled();
      expect(postService.createPost).not.toHaveBeenCalled();
    }));

    it('should prevent double submission', fakeAsync(() => {
      // Arrange
      component.isSubmitting.set(true);
      const emitSpy = jest.spyOn(component.postCreated, 'emit');
      mockPostService.createPost.mockReturnValue(of({ success: true, data: {} as any }));

      // Act
      component.onSubmit();
      tick();

      // Assert
      expect(emitSpy).not.toHaveBeenCalled();
      expect(postService.createPost).not.toHaveBeenCalled();
    }));

    it('should clear isSubmitting immediately after emitting optimistic post', fakeAsync(() => {
      // Arrange
      const mockResponse = { success: true, data: { _id: '123' } };
      mockPostService.createPost.mockReturnValue(of(mockResponse as any));
      const emitSpy = jest.spyOn(component.postCreated, 'emit');

      // Act
      component.onSubmit();
      // Don't tick yet - check state before API response processes

      // Assert - isSubmitting should be cleared immediately after emit
      expect(emitSpy).toHaveBeenCalled();
      expect(component.isSubmitting()).toBe(false);
    }));

    it('should show success notification and close modal on success', fakeAsync(() => {
      // Arrange
      const mockResponse = { success: true, data: { _id: '123', title: 'Test', body: 'Test body' } };
      mockPostService.createPost.mockReturnValue(of(mockResponse as any));
      const emitSpy = jest.spyOn(component.postCreated, 'emit');
      const closeModalSpy = jest.spyOn(component, 'closeModal');

      // Act
      component.onSubmit();
      tick();

      // Assert
      expect(emitSpy).toHaveBeenCalled();
      expect(notificationService.success).toHaveBeenCalledWith('Post published successfully!', 3000);
      expect(closeModalSpy).toHaveBeenCalled();
      expect(component.isSubmitting()).toBe(false);
    }));

    it('should clear loading state before closing modal', fakeAsync(() => {
      // Arrange
      const mockResponse = { success: true, data: { _id: '123' } };
      mockPostService.createPost.mockReturnValue(of(mockResponse as any));

      // Act
      component.onSubmit();
      tick();

      // Assert - loading state should be cleared
      expect(component.isSubmitting()).toBe(false);
    }));

    it('should show error notification on failure', fakeAsync(() => {
      // Arrange
      const errorResponse = { error: { message: 'Validation failed' } };
      mockPostService.createPost.mockReturnValue(throwError(() => errorResponse));
      const emitSpy = jest.spyOn(component.postFailed, 'emit');

      // Act
      component.onSubmit();
      tick();

      // Assert
      expect(emitSpy).toHaveBeenCalled();
      expect(notificationService.error).toHaveBeenCalledWith('Validation failed');
      expect(component.isSubmitting()).toBe(false);
    }));

    it('should show generic error message if error has no message', fakeAsync(() => {
      // Arrange
      mockPostService.createPost.mockReturnValue(throwError(() => ({})));

      // Act
      component.onSubmit();
      tick();

      // Assert
      expect(notificationService.error).toHaveBeenCalledWith('Failed to create post. Please try again.');
    }));

    it('should clear loading state on error', fakeAsync(() => {
      // Arrange
      mockPostService.createPost.mockReturnValue(throwError(() => new Error('Network error')));

      // Act
      component.onSubmit();
      tick();

      // Assert
      expect(component.isSubmitting()).toBe(false);
    }));
  });

  describe('closeModal', () => {
    it('should set showModal to false and emit modalClosed event', () => {
      // Arrange
      const emitSpy = jest.spyOn(component.modalClosed, 'emit');

      // Act
      component.closeModal();

      // Assert
      expect(component.showModal()).toBe(false);
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('should complete destroy$ subject', () => {
      // Arrange
      const nextSpy = jest.spyOn(component['destroy$'], 'next');
      const completeSpy = jest.spyOn(component['destroy$'], 'complete');

      // Act
      component.ngOnDestroy();

      // Assert
      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
