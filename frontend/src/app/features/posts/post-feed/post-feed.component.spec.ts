import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PostFeedComponent } from './post-feed.component';
import { PostService, Comment } from '../../../services/post.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('PostFeedComponent', () => {
  let component: PostFeedComponent;
  let fixture: ComponentFixture<PostFeedComponent>;
  let postService: PostService;

  const mockPosts = {
    success: true,
    data: [
      { _id: '1', title: 'Post 1', content: 'Content 1', author: 'Author 1', recentComments: [] },
      { _id: '2', title: 'Post 2', content: 'Content 2', author: 'Author 2', recentComments: [
        { _id: 'c1', text: 'Comment 1', postId: '2' },
        { _id: 'c2', text: 'Comment 2', postId: '2' },
      ]},
    ],
  };

  const mockComments = {
    success: true,
    data: [
      { _id: 'c1', text: 'Comment 1', postId: '2' },
      { _id: 'c2', text: 'Comment 2', postId: '2' },
      { _id: 'c3', text: 'Comment 3', postId: '2' },
      { _id: 'c4', text: 'Comment 4', postId: '2' },
    ] as Comment[],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostFeedComponent, HttpClientTestingModule],
      providers: [PostService],
    }).compileComponents();

    fixture = TestBed.createComponent(PostFeedComponent);
    component = fixture.componentInstance;
    postService = TestBed.inject(PostService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch posts on initialization', () => {
    spyOn(postService, 'getPosts').and.returnValue(of(mockPosts));
    component.ngOnInit();
    expect(postService.getPosts).toHaveBeenCalled();
    expect(component.posts()).toEqual(mockPosts.data);
    expect(component.isLoading()).toBe(false);
  });

  describe('comment functionality', () => {
    it('should trigger auth alert when comment input is clicked', () => {
      const alertSpy = spyOn(window, 'alert');
      component.onCommentClick();
      expect(alertSpy).toHaveBeenCalledWith('Authentication required to comment. This will be implemented in Epic 2.');
    });

    it('should fetch all comments when "Show all comments" is clicked', () => {
      spyOn(postService, 'getPostComments').and.returnValue(of(mockComments));
      
      const post = mockPosts.data[1];
      component.onShowAllComments(post);
      
      expect(postService.getPostComments).toHaveBeenCalledWith(post._id);
      expect(component.getCommentsForPost(post)).toEqual(mockComments.data);
    });

    it('should toggle comments off when clicking "Show less"', () => {
      spyOn(postService, 'getPostComments').and.returnValue(of(mockComments));
      
      const post = mockPosts.data[1];
      
      // First click - expand
      component.onShowAllComments(post);
      expect(component.getCommentsForPost(post)).toBeTruthy();
      
      // Second click - collapse
      component.onShowAllComments(post);
      expect(component.getCommentsForPost(post)).toBeNull();
    });

    it('should return null for post without expanded comments', () => {
      const post = mockPosts.data[0];
      expect(component.getCommentsForPost(post)).toBeNull();
    });
  });
});
