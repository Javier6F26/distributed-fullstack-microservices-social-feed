import { Test, TestingModule } from '@nestjs/testing';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

describe('PostsController', () => {
  let controller: PostsController;
  let service: PostsService;

  const mockPostData = [{ _id: '1', title: 'Test', content: 'Test', author: 'Author' }];

  const mockPostsService = {
    findAll: jest.fn(),
    search: jest.fn(),
    filter: jest.fn(),
    searchAndFilter: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [
        {
          provide: PostsService,
          useValue: mockPostsService,
        },
      ],
    }).compile();

    controller = module.get<PostsController>(PostsController);
    service = module.get<PostsService>(PostsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return posts', async () => {
      const mockResponse = {
        success: true,
        data: mockPostData,
        nextCursor: null,
      };
      mockPostsService.findAll.mockResolvedValueOnce(mockResponse);

      const result = await controller.findAll(20, undefined);

      expect(result).toEqual(mockResponse);
      expect(service.findAll).toHaveBeenCalledWith(20, undefined);
    });

    it('should use default limit of 20', async () => {
      const mockResponse = { success: true, data: [], nextCursor: null };
      mockPostsService.findAll.mockResolvedValueOnce(mockResponse);

      await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(20, undefined);
    });
  });

  describe('search', () => {
    it('should search posts with query', async () => {
      const mockResponse = {
        success: true,
        data: mockPostData,
        nextCursor: null,
      };
      mockPostsService.search.mockResolvedValueOnce(mockResponse);

      const result = await controller.search({ q: 'test' }, 20, undefined);

      expect(result).toEqual(mockResponse);
      expect(service.search).toHaveBeenCalledWith({ q: 'test' }, 20, undefined);
    });

    it('should handle empty search query', async () => {
      const mockResponse = { success: true, data: [], nextCursor: null };
      mockPostsService.search.mockResolvedValueOnce(mockResponse);

      const result = await controller.search({}, 20, undefined);

      expect(result).toEqual(mockResponse);
      expect(service.search).toHaveBeenCalledWith({}, 20, undefined);
    });
  });

  describe('filter', () => {
    it('should filter posts by date range', async () => {
      const mockResponse = { success: true, data: [], nextCursor: null };
      mockPostsService.filter.mockResolvedValueOnce(mockResponse);

      const result = await controller.filter(
        { startDate: '2024-01-01', endDate: '2024-12-31' },
        20,
        undefined,
      );

      expect(result).toEqual(mockResponse);
      expect(service.filter).toHaveBeenCalledWith(
        { startDate: '2024-01-01', endDate: '2024-12-31' },
        20,
        undefined,
      );
    });

    it('should handle partial date filter', async () => {
      const mockResponse = { success: true, data: [], nextCursor: null };
      mockPostsService.filter.mockResolvedValueOnce(mockResponse);

      const result = await controller.filter(
        { startDate: '2024-01-01' },
        20,
        undefined,
      );

      expect(result).toEqual(mockResponse);
      expect(service.filter).toHaveBeenCalledWith(
        { startDate: '2024-01-01' },
        20,
        undefined,
      );
    });
  });

  describe('searchAndFilter', () => {
    it('should search and filter posts', async () => {
      const mockResponse = { success: true, data: [], nextCursor: null };
      mockPostsService.searchAndFilter.mockResolvedValueOnce(mockResponse);

      const result = await controller.searchAndFilter(
        { q: 'test' },
        { startDate: '2024-01-01', endDate: '2024-12-31' },
        20,
        undefined,
      );

      expect(result).toEqual(mockResponse);
      expect(service.searchAndFilter).toHaveBeenCalledWith(
        { q: 'test' },
        { startDate: '2024-01-01', endDate: '2024-12-31' },
        20,
        undefined,
      );
    });

    it('should handle all optional parameters', async () => {
      const mockResponse = { success: true, data: [], nextCursor: null };
      mockPostsService.searchAndFilter.mockResolvedValueOnce(mockResponse);

      const result = await controller.searchAndFilter({}, {}, 20, undefined);

      expect(result).toEqual(mockResponse);
      expect(service.searchAndFilter).toHaveBeenCalledWith({}, {}, 20, undefined);
    });
  });
});
