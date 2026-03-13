import { TestBed } from '@angular/core/testing';
import { PostService, Post, ApiResponse } from './post.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('PostService', () => {
  let service: PostService;
  let httpMock: HttpTestingController;

  const mockPosts: Post[] = [
    {
      _id: '1',
      authorId: 'user1',
      author: 'Test Author',
      title: 'Test Post',
      body: 'Test content',
      createdAt: new Date().toISOString(),
      commentCount: 0,
      pending: false,
      deleted: false,
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PostService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(PostService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch posts with pagination', (done) => {
    const mockResponse: ApiResponse = {
      success: true,
      data: mockPosts,
      nextCursor: null,
    };

    service.getPosts(20).subscribe((response) => {
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockPosts);
      expect(response.nextCursor).toBeNull();
      done();
    });

    const req = httpMock.expectOne('/api/v1/posts?limit=20');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should search posts by query', (done) => {
    const mockResponse: ApiResponse = {
      success: true,
      data: mockPosts,
      nextCursor: null,
    };

    service.searchPosts('test').subscribe((response) => {
      expect(response.success).toBe(true);
      expect(response.data.length).toBe(1);
      done();
    });

    const req = httpMock.expectOne('/api/v1/posts/search?q=test&limit=20');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should create a new post', (done) => {
    const mockCreateResponse = {
      success: true,
      message: 'Post created successfully',
      data: {
        _id: '1',
        tempId: 'temp-1',
        userId: 'user1',
        title: 'New Post',
        body: 'New content',
        createdAt: new Date().toISOString(),
        pending: false,
        commentCount: 0,
        deleted: false,
      },
    };

    service.createPost('New Post', 'New content', 'temp-1').subscribe((response) => {
      expect(response.success).toBe(true);
      expect(response.data.title).toBe('New Post');
      done();
    });

    const req = httpMock.expectOne('/api/v1/posts');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.title).toBe('New Post');
    expect(req.request.body.body).toBe('New content');
    req.flush(mockCreateResponse);
  });

  it('should delete a post', (done) => {
    service.deletePost('1').subscribe((response) => {
      expect(response).toEqual({});
      done();
    });

    const req = httpMock.expectOne('/api/v1/posts/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('should update a post', (done) => {
    const mockUpdateResponse = {
      success: true,
      message: 'Post updated successfully',
      data: {
        _id: '1',
        userId: 'user1',
        title: 'Updated Post',
        body: 'Updated content',
        createdAt: new Date().toISOString(),
        pending: false,
        commentCount: 0,
        deleted: false,
      },
    };

    service.updatePost('1', 'Updated Post', 'Updated content').subscribe((response) => {
      expect(response.success).toBe(true);
      expect(response.data.title).toBe('Updated Post');
      done();
    });

    const req = httpMock.expectOne('/api/v1/posts/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.title).toBe('Updated Post');
    req.flush(mockUpdateResponse);
  });

  it('should fetch comments for a post', (done) => {
    const mockComments = {
      success: true,
      data: [
        {
          _id: 'c1',
          postId: '1',
          authorId: 'user1',
          name: 'Test User',
          email: 'test@example.com',
          body: 'Test comment',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    service.getPostComments('1').subscribe((response) => {
      expect(response.success).toBe(true);
      expect(response.data.length).toBe(1);
      done();
    });

    const req = httpMock.expectOne('/api/v1/posts/post/1/comments');
    expect(req.request.method).toBe('GET');
    req.flush(mockComments);
  });

  it('should remove optimistic post from feed on error', () => {
    const posts: Post[] = [
      { ...mockPosts[0], tempId: 'temp-1' },
      { ...mockPosts[0], _id: '2', tempId: 'temp-2' },
    ];

    const result = service.removeOptimisticPost(posts, 'temp-1');

    expect(result.length).toBe(1);
    expect(result[0].tempId).toBe('temp-2');
  });
});
