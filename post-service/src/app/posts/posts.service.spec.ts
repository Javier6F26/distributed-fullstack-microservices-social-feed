import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PostsService } from './posts.service';
import { Post, PostDocument } from '../schemas/post.schema';
import { SearchPostsDto } from './dto/search-posts.dto';
import { FilterPostsDto } from './dto/filter-posts.dto';

describe('PostsService', () => {
  let service: PostsService;
  let postModel: Model<PostDocument>;

  const mockPost = {
    _id: 'test-id',
    title: 'Test Post',
    content: 'Test content',
    author: 'Test Author',
    createdAt: new Date(),
  };

  const mockPostModel = {
    find: jest.fn(),
    sort: jest.fn(),
    limit: jest.fn(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: getModelToken(Post.name),
          useValue: mockPostModel,
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    postModel = module.get<Model<PostDocument>>(getModelToken(Post.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should search posts by query term', async () => {
      const searchDto: SearchPostsDto = { q: 'test' };
      mockPostModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPost]),
          }),
        }),
      });

      const result = await service.search(searchDto, 20);

      expect(mockPostModel.find).toHaveBeenCalled();
      expect(result.posts).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it('should handle case-insensitive search', async () => {
      const searchDto: SearchPostsDto = { q: 'TEST' };
      mockPostModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPost]),
          }),
        }),
      });

      await service.search(searchDto, 20);

      expect(mockPostModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ title: expect.any(Object) }),
          ]),
        }),
      );
    });

    it('should return empty array when no matches found', async () => {
      const searchDto: SearchPostsDto = { q: 'nonexistent' };
      mockPostModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.search(searchDto, 20);

      expect(result.posts).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });
  });

  describe('filter', () => {
    it('should filter posts by date range', async () => {
      const filterDto: FilterPostsDto = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };
      mockPostModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPost]),
          }),
        }),
      });

      const result = await service.filter(filterDto, 20);

      expect(mockPostModel.find).toHaveBeenCalled();
      expect(result.posts).toHaveLength(1);
    });

    it('should handle invalid date gracefully', async () => {
      const filterDto: FilterPostsDto = {
        startDate: 'invalid-date',
        endDate: '2024-12-31',
      };
      mockPostModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPost]),
          }),
        }),
      });

      const result = await service.filter(filterDto, 20);

      expect(mockPostModel.find).toHaveBeenCalled();
      expect(result.posts).toHaveLength(1);
    });

    it('should accept only start date', async () => {
      const filterDto: FilterPostsDto = { startDate: '2024-01-01' };
      mockPostModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPost]),
          }),
        }),
      });

      const result = await service.filter(filterDto, 20);

      expect(mockPostModel.find).toHaveBeenCalled();
      expect(result.posts).toHaveLength(1);
    });
  });

  describe('searchAndFilter', () => {
    it('should combine search and date filter', async () => {
      const searchDto: SearchPostsDto = { q: 'test' };
      const filterDto: FilterPostsDto = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };
      mockPostModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPost]),
          }),
        }),
      });

      const result = await service.searchAndFilter(searchDto, filterDto, 20);

      expect(mockPostModel.find).toHaveBeenCalled();
      expect(result.posts).toHaveLength(1);
    });

    it('should handle empty search and filter', async () => {
      const searchDto: SearchPostsDto = {};
      const filterDto: FilterPostsDto = {};
      mockPostModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPost]),
          }),
        }),
      });

      const result = await service.searchAndFilter(searchDto, filterDto, 20);

      expect(mockPostModel.find).toHaveBeenCalled();
      expect(result.posts).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('should return posts with pagination', async () => {
      mockPostModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockPost]),
          }),
        }),
      });

      const result = await service.findAll(20);

      expect(mockPostModel.find).toHaveBeenCalled();
      expect(result.posts).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });
  });
});
