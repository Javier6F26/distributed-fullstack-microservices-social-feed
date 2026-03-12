import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommentCardComponent } from './comment-card.component';
import { AuthService } from '../../../services/auth.service';
import { CommentService } from '../../../services/comment.service';
import { NotificationService } from '../../../services/notification.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import type { Comment } from '../../../services/comment.service';

describe('CommentCardComponent - Delete Functionality', () => {
  let component: CommentCardComponent;
  let fixture: ComponentFixture<CommentCardComponent>;
  let authServiceSpy: any;
  let commentServiceSpy: any;
  let notificationServiceSpy: any;
  let modalServiceSpy: any;

  const mockComment: Comment = {
    _id: 'comment-1',
    postId: 'post-1',
    authorId: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    body: 'Test comment',
    createdAt: new Date().toISOString(),
    pending: false,
  };

  beforeEach(async () => {
    authServiceSpy = {
      getCurrentUser: vi.fn(),
    };

    commentServiceSpy = {
      deleteComment: vi.fn(),
    };

    notificationServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
    };

    modalServiceSpy = {
      open: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CommentCardComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CommentService, useValue: commentServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: NgbModal, useValue: modalServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommentCardComponent);
    component = fixture.componentInstance;
    component.comment = mockComment;

    // Setup auth state
    authServiceSpy.getCurrentUser.mockReturnValue({ _id: 'user-123' });
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('canDeleteComment', () => {
    it('should return true when current user is comment author', () => {
      authServiceSpy.getCurrentUser.mockReturnValue({ _id: 'user-123' });

      const result = component.canDeleteComment();

      expect(result).toBeTruthy();
    });

    it('should return false when current user is not comment author', () => {
      authServiceSpy.getCurrentUser.mockReturnValue({ _id: 'user-456' });

      const result = component.canDeleteComment();

      expect(result).toBeFalsy();
    });

    it('should return false when no user is logged in', () => {
      authServiceSpy.getCurrentUser.mockReturnValue(null);

      const result = component.canDeleteComment();

      expect(result).toBeFalsy();
    });
  });

  describe('onDeleteComment', () => {
    it('should open confirmation dialog', () => {
      const modalRefSpy = {
        result: Promise.resolve(true),
      };
      modalServiceSpy.open.mockReturnValue(modalRefSpy);

      component.onDeleteComment();

      expect(modalServiceSpy.open).toHaveBeenCalled();
    });

    it('should call confirmDeleteComment when user confirms', async () => {
      const confirmSpy = vi.spyOn(component as any, 'confirmDeleteComment');
      const modalRefSpy = {
        result: Promise.resolve(true),
      };
      modalServiceSpy.open.mockReturnValue(modalRefSpy);

      component.onDeleteComment();
      await Promise.resolve();

      expect(confirmSpy).toHaveBeenCalled();
    });

    it('should not call confirmDeleteComment when user cancels', async () => {
      const confirmSpy = vi.spyOn(component as any, 'confirmDeleteComment');
      const modalRefSpy = {
        result: Promise.reject('cancelled'),
      };
      modalServiceSpy.open.mockReturnValue(modalRefSpy);

      component.onDeleteComment();
      await Promise.resolve().catch(() => {});

      expect(confirmSpy).not.toHaveBeenCalled();
    });
  });

  describe('confirmDeleteComment', () => {
    it('should emit commentDeleted event', () => {
      const emitSpy = vi.spyOn(component.commentDeleted, 'emit');

      commentServiceSpy.deleteComment.mockReturnValue({
        subscribe: vi.fn(({ next }) => next()),
      });

      (component as any).confirmDeleteComment();

      expect(emitSpy).toHaveBeenCalledWith('comment-1');
    });

    it('should show success notification on API success', () => {
      commentServiceSpy.deleteComment.mockReturnValue({
        subscribe: vi.fn(({ next }) => next()),
      });

      (component as any).confirmDeleteComment();

      expect(notificationServiceSpy.success).toHaveBeenCalledWith('Comment deleted successfully');
    });

    it('should emit commentDeleteFailed and show error on API failure', () => {
      const failEmitSpy = vi.spyOn(component.commentDeleteFailed, 'emit');

      commentServiceSpy.deleteComment.mockReturnValue({
        subscribe: vi.fn(({ error }) => error(new Error('Failed'))),
      });

      (component as any).confirmDeleteComment();

      expect(failEmitSpy).toHaveBeenCalledWith({
        commentId: 'comment-1',
        comment: mockComment,
      });
      expect(notificationServiceSpy.error).toHaveBeenCalledWith('Failed to delete comment. Please try again.');
    });

    it('should set isDeleting state during deletion', () => {
      let subscribeCallback: any;
      commentServiceSpy.deleteComment.mockReturnValue({
        subscribe: vi.fn((cb) => {
          subscribeCallback = cb;
        }),
      });

      (component as any).confirmDeleteComment();

      expect(component.isDeleting()).toBeTruthy();

      // Simulate success
      subscribeCallback.next();

      expect(component.isDeleting()).toBeFalsy();
    });
  });

  describe('Output events', () => {
    it('should have commentDeleted EventEmitter', () => {
      expect(component.commentDeleted).toBeDefined();
    });

    it('should have commentDeleteFailed EventEmitter', () => {
      expect(component.commentDeleteFailed).toBeDefined();
    });
  });
});
