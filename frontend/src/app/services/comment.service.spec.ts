import { TestBed } from '@angular/core/testing';
import { CommentService, CreateCommentResponse } from './comment.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('CommentService', () => {
  let service: CommentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CommentService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(CommentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a comment', (done) => {
    const mockResponse: CreateCommentResponse = {
      success: true,
      message: 'Comment created successfully',
      data: {
        tempId: 'temp-c1',
        postId: 'post-1',
        userId: 'user1',
        authorUsername: 'testuser',
        body: 'Test comment',
        createdAt: new Date().toISOString(),
        pending: false,
        likes: 0,
        isEdited: false,
      },
    };

    service.createComment('post-1', 'Test comment').subscribe((response) => {
      expect(response.success).toBe(true);
      expect(response.data.body).toBe('Test comment');
      done();
    });

    const req = httpMock.expectOne('/api/v1/comments');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.postId).toBe('post-1');
    expect(req.request.body.body).toBe('Test comment');
    req.flush(mockResponse);
  });

  it('should fetch comments for a post', (done) => {
    const mockResponse = {
      success: true,
      data: [
        {
          _id: 'c1',
          postId: 'post-1',
          authorId: 'user1',
          name: 'Test User',
          email: 'test@example.com',
          body: 'Test comment',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    service.getPostComments('post-1').subscribe((response) => {
      expect(response.success).toBe(true);
      expect(response.data.length).toBe(1);
      expect(response.data[0].postId).toBe('post-1');
      done();
    });

    const req = httpMock.expectOne('/api/v1/posts/post/post-1/comments');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should delete a comment', (done) => {
    service.deleteComment('c1').subscribe((response) => {
      expect(response).toEqual({});
      done();
    });

    const req = httpMock.expectOne('/api/v1/comments/c1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('should update a comment', (done) => {
    const mockResponse: CreateCommentResponse = {
      success: true,
      message: 'Comment updated successfully',
      data: {
        postId: 'post-1',
        userId: 'user1',
        authorUsername: 'testuser',
        body: 'Updated comment',
        createdAt: new Date().toISOString(),
        pending: false,
        likes: 0,
        isEdited: false,
      },
    };

    service.updateComment('c1', 'Updated comment').subscribe((response) => {
      expect(response.success).toBe(true);
      expect(response.data.body).toBe('Updated comment');
      done();
    });

    const req = httpMock.expectOne('/api/v1/comments/c1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.body).toBe('Updated comment');
    req.flush(mockResponse);
  });

  it('should remove optimistic comment from list on error', () => {
    const comments = [
      {
        _id: 'c1',
        postId: 'post-1',
        authorId: 'user1',
        name: 'User 1',
        email: 'user1@test.com',
        body: 'Comment 1',
        createdAt: new Date().toISOString(),
        tempId: 'temp-c1',
      },
      {
        _id: 'c2',
        postId: 'post-1',
        authorId: 'user2',
        name: 'User 2',
        email: 'user2@test.com',
        body: 'Comment 2',
        createdAt: new Date().toISOString(),
        tempId: 'temp-c2',
      },
    ];

    const result = service.removeOptimisticComment(comments, 'temp-c1');

    expect(result.length).toBe(1);
    expect(result[0].tempId).toBe('temp-c2');
  });
});
