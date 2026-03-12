import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PostService, Post, ApiResponse } from './post.service';

describe('PostService', () => {
  let service: PostService;
  let httpMock: HttpTestingController;

  const mockPosts: Post[] = [
    { _id: '1', title: 'Post 1', content: 'Content 1', author: 'Author 1' },
    { _id: '2', title: 'Post 2', content: 'Content 2', author: 'Author 2' },
  ];

  const mockApiResponse: ApiResponse = {
    success: true,
    data: mockPosts,
    nextCursor: 'cursor-123',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PostService],
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

  describe('getPosts', () => {
    it('should return posts with default limit', () => {
      service.getPosts().subscribe((response) => {
        expect(response).toEqual(mockApiResponse);
      });

      const req = httpMock.expectOne('/api/posts?limit=20');
      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });

    it('should return posts with custom limit and cursor', () => {
      service.getPosts(10, 'cursor-abc').subscribe((response) => {
        expect(response).toEqual(mockApiResponse);
      });

      const req = httpMock.expectOne('/api/posts?limit=10&cursor=cursor-abc');
      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });
  });

  describe('searchPosts', () => {
    it('should search posts with query', () => {
      service.searchPosts('test').subscribe((response) => {
        expect(response).toEqual(mockApiResponse);
      });

      const req = httpMock.expectOne('/api/posts/search?q=test&limit=20');
      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });

    it('should search posts with cursor', () => {
      service.searchPosts('test', 10, 'cursor-xyz').subscribe((response) => {
        expect(response).toEqual(mockApiResponse);
      });

      const req = httpMock.expectOne('/api/posts/search?q=test&limit=10&cursor=cursor-xyz');
      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });
  });

  describe('filterPosts', () => {
    it('should filter posts by date range', () => {
      service.filterPosts('2024-01-01', '2024-12-31').subscribe((response) => {
        expect(response).toEqual(mockApiResponse);
      });

      const req = httpMock.expectOne(
        '/api/posts/filter?startDate=2024-01-01&endDate=2024-12-31&limit=20',
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });

    it('should filter with only start date', () => {
      service.filterPosts('2024-01-01').subscribe((response) => {
        expect(response).toEqual(mockApiResponse);
      });

      const req = httpMock.expectOne(
        '/api/posts/filter?startDate=2024-01-01&limit=20',
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });
  });

  describe('searchAndFilterPosts', () => {
    it('should search and filter posts', () => {
      service
        .searchAndFilterPosts('test', '2024-01-01', '2024-12-31')
        .subscribe((response) => {
          expect(response).toEqual(mockApiResponse);
        });

      const req = httpMock.expectOne(
        '/api/posts/search-filter?q=test&startDate=2024-01-01&endDate=2024-12-31&limit=20',
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });

    it('should handle optional parameters', () => {
      service
        .searchAndFilterPosts(undefined, undefined, undefined, 10)
        .subscribe((response) => {
          expect(response).toEqual(mockApiResponse);
        });

      const req = httpMock.expectOne('/api/posts/search-filter?limit=10');
      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });
  });
});
