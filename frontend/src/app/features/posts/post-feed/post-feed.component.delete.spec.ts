import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PostFeedComponent } from './post-feed.component';
import { PostService } from '../../../services/post.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

describe('PostFeedComponent - Delete Functionality', () => {
  let component: PostFeedComponent;
  let fixture: ComponentFixture<PostFeedComponent>;
  let postServiceSpy: any;
  let notificationServiceSpy: any;
  let modalServiceSpy: any;
  let authServiceSpy: any;

  const mockPost = {
    _id: 'post-1',
    authorId: 'user-123',
    author: 'Test User',
    title: 'Test Post',
    body: 'Test content',
    createdAt: new Date().toISOString(),
    pending: false,
    deleted: false,
    commentCount: 0,
  };

  beforeEach(async () => {
    postServiceSpy = {
      deletePost: vi.fn(),
    };

    notificationServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
    };

    modalServiceSpy = {
      open: vi.fn(),
    };

    authServiceSpy = {
      getCurrentUser: vi.fn(),
      isAuthenticated: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PostFeedComponent],
      providers: [
        { provide: PostService, useValue: postServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: NgbModal, useValue: modalServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PostFeedComponent);
    component = fixture.componentInstance;

    // Setup auth state
    authServiceSpy.getCurrentUser.mockReturnValue({ _id: 'user-123' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('canDeletePost', () => {
    it('should return true when current user is post author', () => {
      authServiceSpy.getCurrentUser.mockReturnValue({ _id: 'user-123' });

      const result = component.canDeletePost(mockPost);

      expect(result).toBeTruthy();
    });

    it('should return false when current user is not post author', () => {
      authServiceSpy.getCurrentUser.mockReturnValue({ _id: 'user-456' });

      const result = component.canDeletePost(mockPost);

      expect(result).toBeFalsy();
    });

    it('should return false when no user is logged in', () => {
      authServiceSpy.getCurrentUser.mockReturnValue(null);

      const result = component.canDeletePost(mockPost);

      expect(result).toBeFalsy();
    });
  });

  describe('onDeletePost', () => {
    it('should open confirmation dialog', () => {
      const modalRefSpy = {
        result: Promise.resolve(true),
      };
      modalServiceSpy.open.mockReturnValue(modalRefSpy);

      component.onDeletePost(mockPost);

      expect(modalServiceSpy.open).toHaveBeenCalled();
    });

    it('should call confirmDeletePost when user confirms', async () => {
      const confirmSpy = vi.spyOn(component as any, 'confirmDeletePost');
      const modalRefSpy = {
        result: Promise.resolve(true),
      };
      modalServiceSpy.open.mockReturnValue(modalRefSpy);

      component.onDeletePost(mockPost);
      await Promise.resolve(); // Wait for modal result

      expect(confirmSpy).toHaveBeenCalledWith(mockPost);
    });

    it('should not call confirmDeletePost when user cancels', async () => {
      const confirmSpy = vi.spyOn(component as any, 'confirmDeletePost');
      const modalRefSpy = {
        result: Promise.reject('cancelled'),
      };
      modalServiceSpy.open.mockReturnValue(modalRefSpy);

      component.onDeletePost(mockPost);
      await Promise.resolve().catch(() => {}); // Wait for modal result

      expect(confirmSpy).not.toHaveBeenCalled();
    });
  });

  describe('confirmDeletePost', () => {
    it('should remove post optimistically and show success on API success', () => {
      postServiceSpy.deletePost.mockReturnValue({
        subscribe: vi.fn(({ next }) => next()),
      });

      component.posts.set([mockPost]);
      (component as any).confirmDeletePost(mockPost);

      expect(component.posts().length).toBe(0);
      expect(notificationServiceSpy.success).toHaveBeenCalledWith('Post deleted successfully');
    });

    it('should rollback post on API error', () => {
      postServiceSpy.deletePost.mockReturnValue({
        subscribe: vi.fn(({ error }) => error(new Error('Failed'))),
      });

      component.posts.set([mockPost]);
      (component as any).confirmDeletePost(mockPost);

      expect(component.posts().length).toBe(1);
      expect(notificationServiceSpy.error).toHaveBeenCalledWith('Failed to delete post. Please try again.');
    });

    it('should set isDeleting state during deletion', () => {
      let subscribeCallback: any;
      postServiceSpy.deletePost.mockReturnValue({
        subscribe: vi.fn((cb) => {
          subscribeCallback = cb;
        }),
      });

      component.posts.set([mockPost]);
      (component as any).confirmDeletePost(mockPost);

      expect(component.isDeletingPost()).toBe('post-1');

      // Simulate success
      subscribeCallback.next();

      expect(component.isDeletingPost()).toBeNull();
    });
  });
});
