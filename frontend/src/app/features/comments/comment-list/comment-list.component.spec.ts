import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommentListComponent } from './comment-list.component';
import { CommentService } from '../../../services/comment.service';
import { AuthService } from '../../../services/auth.service';

describe('CommentListComponent', () => {
  let component: CommentListComponent;
  let fixture: ComponentFixture<CommentListComponent>;
  let commentServiceSpy: jasmine.SpyObj<CommentService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const commentSpy = jasmine.createSpyObj('CommentService', ['getPostComments']);
    const authSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated']);

    await TestBed.configureTestingModule({
      imports: [CommentListComponent],
      providers: [
        provideRouter([]),
        { provide: CommentService, useValue: commentSpy },
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommentListComponent);
    component = fixture.componentInstance;
    commentServiceSpy = TestBed.inject(CommentService) as jasmine.SpyObj<CommentService>;
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  it('should create', () => {
    component.postId = 'post-123';
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load comments on init', () => {
    commentServiceSpy.getPostComments.and.returnValue({
      subscribe: jasmine.createSpy().and.callFake((callbacks: { next: (arg: { success: boolean; data: unknown[] }) => void }) => {
        callbacks.next({ success: true, data: [] });
      }),
    } as unknown as ReturnType<typeof commentServiceSpy.getPostComments>);

    component.postId = 'post-123';
    fixture.detectChanges();

    expect(commentServiceSpy.getPostComments).toHaveBeenCalledWith('post-123');
  });

  it('should show auth prompt when user is not authenticated', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);
    component.postId = 'post-123';
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.auth-prompt')).toBeTruthy();
  });

  it('should show comment input when user is authenticated', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    component.postId = 'post-123';
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-comment-input')).toBeTruthy();
  });

  it('should add optimistic comment on submission', () => {
    component.postId = 'post-123';
    fixture.detectChanges();

    const optimisticComment = {
      tempId: 'temp-123',
      postId: 'post-123',
      authorUsername: 'testuser',
      body: 'Test comment',
      createdAt: new Date().toISOString(),
      pending: true,
    };

    component.onCommentSubmitted({ comment: optimisticComment, tempId: 'temp-123' });

    expect(component.comments().length).toBe(1);
    expect(component.comments()[0].pending).toBe(true);
  });

  it('should remove optimistic comment on failure', () => {
    component.postId = 'post-123';
    fixture.detectChanges();

    // Add optimistic comment first
    const optimisticComment = {
      tempId: 'temp-123',
      postId: 'post-123',
      authorUsername: 'testuser',
      body: 'Test comment',
      createdAt: new Date().toISOString(),
      pending: true,
    };

    component.onCommentSubmitted({ comment: optimisticComment, tempId: 'temp-123' });
    expect(component.comments().length).toBe(1);

    // Remove on failure
    component.onCommentFailed({ tempId: 'temp-123', postId: 'post-123' });
    expect(component.comments().length).toBe(0);
  });

  it('should display comments sorted by newest first', () => {
    component.postId = 'post-123';
    fixture.detectChanges();

    const oldComment = {
      _id: '1',
      postId: 'post-123',
      authorUsername: 'user1',
      body: 'Old comment',
      createdAt: new Date(Date.now() - 1000000).toISOString(),
    };

    const newComment = {
      _id: '2',
      postId: 'post-123',
      authorUsername: 'user2',
      body: 'New comment',
      createdAt: new Date().toISOString(),
    };

    component.comments.set([oldComment, newComment]);
    fixture.detectChanges();

    const displayComments = component.displayComments();
    expect(displayComments[0]).toBe(newComment);
    expect(displayComments[1]).toBe(oldComment);
  });

  it('should show empty state when no comments', () => {
    commentServiceSpy.getPostComments.and.returnValue({
      subscribe: jasmine.createSpy().and.callFake((callbacks: { next: (arg: { success: boolean; data: unknown[] }) => void }) => {
        callbacks.next({ success: true, data: [] });
      }),
    } as unknown as ReturnType<typeof commentServiceSpy.getPostComments>);

    component.postId = 'post-123';
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state')).toBeTruthy();
  });

  describe('trackByComment', () => {
    it('should return tempId if available', () => {
      const comment = {
        tempId: 'temp-123',
        postId: 'post-123',
        authorUsername: 'testuser',
        body: 'Test',
        createdAt: new Date().toISOString(),
      };

      expect(component.trackByComment(0, comment)).toBe('temp-123');
    });

    it('should return _id if tempId not available', () => {
      const comment = {
        _id: 'comment-123',
        postId: 'post-123',
        authorUsername: 'testuser',
        body: 'Test',
        createdAt: new Date().toISOString(),
      };

      expect(component.trackByComment(0, comment)).toBe('comment-123');
    });

    it('should return index as fallback', () => {
      const comment = {
        postId: 'post-123',
        authorUsername: 'testuser',
        body: 'Test',
        createdAt: new Date().toISOString(),
      };

      expect(component.trackByComment(5, comment)).toBe('5');
    });
  });
});
