import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CommentListComponent } from './comment-list/comment-list.component';
import { AuthService } from '../../../services/auth.service';
import { Comment } from '../../../services/comment.service';

describe('Comment Integration Tests', () => {
  let fixture: ComponentFixture<CommentListComponent>;
  let component: CommentListComponent;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const mockUser = {
    _id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
  };

  const mockComments: Comment[] = [
    {
      _id: 'comment-1',
      postId: 'post-123',
      authorUsername: 'user1',
      body: 'First comment',
      createdAt: new Date(Date.now() - 1000000).toISOString(),
    },
    {
      _id: 'comment-2',
      postId: 'post-123',
      authorUsername: 'user2',
      body: 'Second comment',
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'getCurrentUser']);
    authSpy.isAuthenticated.and.returnValue(true);
    authSpy.getCurrentUser.and.returnValue(mockUser);

    await TestBed.configureTestingModule({
      imports: [CommentListComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommentListComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    component.postId = 'post-123';
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Comment Loading Integration', () => {
    it('should load comments from API on init', fakeAsync(() => {
      // Trigger initial detection
      tick();

      // Expect GET request to comments endpoint
      const req = httpMock.expectOne('/api/v1/posts/post/post-123/comments');
      expect(req.request.method).toBe('GET');

      // Mock response
      req.flush({
        success: true,
        data: mockComments,
      });

      tick();
      fixture.detectChanges();

      // Verify comments are loaded
      expect(component.comments().length).toBe(2);
      expect(component.isLoading()).toBeFalse();
    }));

    it('should handle API error when loading comments', fakeAsync(() => {
      tick();

      const req = httpMock.expectOne('/api/v1/posts/post/post-123/comments');
      
      // Mock error response
      req.flush('Internal Server Error', {
        status: 500,
        statusText: 'Server Error',
      });

      tick();
      fixture.detectChanges();

      // Verify loading state is cleared
      expect(component.isLoading()).toBeFalse();
      expect(component.comments().length).toBe(0);
    }));

    it('should display comments sorted by newest first', fakeAsync(() => {
      tick();

      const req = httpMock.expectOne('/api/v1/posts/post/post-123/comments');
      req.flush({
        success: true,
        data: mockComments,
      });

      tick();
      fixture.detectChanges();

      const displayComments = component.displayComments();
      // Second comment (newer) should be first
      expect(displayComments[0]._id).toBe('comment-2');
      expect(displayComments[1]._id).toBe('comment-1');
    }));
  });

  describe('Comment Creation Integration', () => {
    it('should create comment via API and show optimistic UI', fakeAsync(() => {
      tick();

      // Load initial comments
      const req = httpMock.expectOne('/api/v1/posts/post/post-123/comments');
      req.flush({
        success: true,
        data: [],
      });

      tick();
      fixture.detectChanges();

      // Simulate comment submission from child component
      const optimisticComment: Comment = {
        tempId: 'temp-123',
        postId: 'post-123',
        authorUsername: 'testuser',
        body: 'New comment',
        createdAt: new Date().toISOString(),
        pending: true,
      };

      component.onCommentSubmitted({ comment: optimisticComment, tempId: 'temp-123' });
      fixture.detectChanges();

      // Verify optimistic comment is displayed immediately
      expect(component.comments().length).toBe(1);
      expect(component.comments()[0].pending).toBeTrue();
      expect(component.comments()[0].tempId).toBe('temp-123');

      // Expect POST request to comments endpoint
      const createReq = httpMock.expectOne('/api/v1/comments');
      expect(createReq.request.method).toBe('POST');
      expect(createReq.request.body).toEqual({
        postId: 'post-123',
        body: 'New comment',
      });

      // Mock successful API response
      createReq.flush({
        success: true,
        message: 'Comment created successfully',
        data: {
          _id: 'comment-new',
          postId: 'post-123',
          authorUsername: 'testuser',
          body: 'New comment',
          createdAt: new Date().toISOString(),
        },
      });

      tick();
      fixture.detectChanges();

      // Comment should still be in list (now confirmed)
      expect(component.comments().length).toBe(1);
    }));

    it('should remove optimistic comment on API failure', fakeAsync(() => {
      tick();

      const req = httpMock.expectOne('/api/v1/posts/post/post-123/comments');
      req.flush({
        success: true,
        data: [],
      });

      tick();
      fixture.detectChanges();

      // Submit optimistic comment
      const optimisticComment: Comment = {
        tempId: 'temp-456',
        postId: 'post-123',
        authorUsername: 'testuser',
        body: 'Failed comment',
        createdAt: new Date().toISOString(),
        pending: true,
      };

      component.onCommentSubmitted({ comment: optimisticComment, tempId: 'temp-456' });
      fixture.detectChanges();

      expect(component.comments().length).toBe(1);

      // Expect POST request
      const createReq = httpMock.expectOne('/api/v1/comments');

      // Mock API error
      createReq.flush({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'body', message: 'Comment is required' }],
      }, {
        status: 400,
        statusText: 'Bad Request',
      });

      tick();
      fixture.detectChanges();

      // Simulate failure event from child component
      component.onCommentFailed({ tempId: 'temp-456', postId: 'post-123' });
      fixture.detectChanges();

      // Optimistic comment should be removed
      expect(component.comments().length).toBe(0);
    }));

    it('should handle network error during comment creation', fakeAsync(() => {
      tick();

      const req = httpMock.expectOne('/api/v1/posts/post/post-123/comments');
      req.flush({ success: true, data: [] });

      tick();
      fixture.detectChanges();

      // Submit optimistic comment
      const optimisticComment: Comment = {
        tempId: 'temp-789',
        postId: 'post-123',
        authorUsername: 'testuser',
        body: 'Network error comment',
        createdAt: new Date().toISOString(),
        pending: true,
      };

      component.onCommentSubmitted({ comment: optimisticComment, tempId: 'temp-789' });
      fixture.detectChanges();

      const createReq = httpMock.expectOne('/api/v1/comments');

      // Mock network error
      createReq.flush(null, {
        status: 0,
        statusText: 'Network Error',
      });

      tick();
      fixture.detectChanges();

      // Simulate failure event
      component.onCommentFailed({ tempId: 'temp-789', postId: 'post-123' });
      fixture.detectChanges();

      expect(component.comments().length).toBe(0);
    }));
  });

  describe('Authentication Integration', () => {
    it('should show comment input for authenticated users', () => {
      authServiceSpy.isAuthenticated.and.returnValue(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('app-comment-input')).toBeTruthy();
    });

    it('should show auth prompt for unauthenticated users', () => {
      authServiceSpy.isAuthenticated.and.returnValue(false);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.auth-prompt')).toBeTruthy();
      expect(compiled.querySelector('.login-link')).toBeTruthy();
      expect(compiled.querySelector('.register-link')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty comments list', fakeAsync(() => {
      tick();

      const req = httpMock.expectOne('/api/v1/posts/post/post-123/comments');
      req.flush({
        success: true,
        data: [],
      });

      tick();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.empty-state')).toBeTruthy();
      expect(compiled.querySelector('.empty-state p')?.textContent).toContain('No comments yet');
    }));

    it('should handle comments with missing optional fields', fakeAsync(() => {
      tick();

      const req = httpMock.expectOne('/api/v1/posts/post/post-123/comments');
      req.flush({
        success: true,
        data: [
          {
            _id: 'comment-minimal',
            postId: 'post-123',
            authorUsername: 'anonymous',
            body: 'Minimal comment',
            createdAt: new Date().toISOString(),
            // Missing optional fields: likes, isEdited, etc.
          },
        ],
      });

      tick();
      fixture.detectChanges();

      expect(component.comments().length).toBe(1);
      expect(component.comments()[0].body).toBe('Minimal comment');
    }));

    it('should handle very long comment body', fakeAsync(() => {
      tick();

      const longBody = 'a'.repeat(1000);
      const req = httpMock.expectOne('/api/v1/posts/post/post-123/comments');
      req.flush({
        success: true,
        data: [
          {
            _id: 'comment-long',
            postId: 'post-123',
            authorUsername: 'verboseuser',
            body: longBody,
            createdAt: new Date().toISOString(),
          },
        ],
      });

      tick();
      fixture.detectChanges();

      expect(component.comments().length).toBe(1);
      expect(component.comments()[0].body.length).toBe(1000);
    }));

    it('should handle rapid successive comment submissions', fakeAsync(() => {
      tick();

      const req = httpMock.expectOne('/api/v1/posts/post/post-123/comments');
      req.flush({ success: true, data: [] });

      tick();
      fixture.detectChanges();

      // Submit multiple comments rapidly
      for (let i = 0; i < 5; i++) {
        const optimisticComment: Comment = {
          tempId: `temp-${i}`,
          postId: 'post-123',
          authorUsername: 'testuser',
          body: `Comment ${i}`,
          createdAt: new Date().toISOString(),
          pending: true,
        };

        component.onCommentSubmitted({ comment: optimisticComment, tempId: `temp-${i}` });
      }

      fixture.detectChanges();

      // All optimistic comments should be displayed
      expect(component.comments().length).toBe(5);
      expect(component.comments()[0].body).toBe('Comment 4'); // Last one is first (newest)
    }));
  });

  describe('State Management', () => {
    it('should update isLoading state correctly', fakeAsync(() => {
      // Initial state should be false
      expect(component.isLoading()).toBeFalse();

      component.loadComments();
      fixture.detectChanges();

      // Should be loading during API call
      expect(component.isLoading()).toBeTrue();

      const req = httpMock.expectOne('/api/v1/posts/post/post-123/comments');
      req.flush({ success: true, data: [] });

      tick();
      fixture.detectChanges();

      // Should stop loading after response
      expect(component.isLoading()).toBeFalse();
    }));

    it('should maintain comments across component updates', fakeAsync(() => {
      tick();

      const req = httpMock.expectOne('/api/v1/posts/post/post-123/comments');
      req.flush({
        success: true,
        data: mockComments,
      });

      tick();
      fixture.detectChanges();

      // Add optimistic comment
      const optimisticComment: Comment = {
        tempId: 'temp-new',
        postId: 'post-123',
        authorUsername: 'testuser',
        body: 'New comment',
        createdAt: new Date().toISOString(),
        pending: true,
      };

      component.onCommentSubmitted({ comment: optimisticComment, tempId: 'temp-new' });
      fixture.detectChanges();

      // Verify both loaded and optimistic comments exist
      expect(component.comments().length).toBe(3); // 2 loaded + 1 optimistic
    }));
  });
});
