import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeletionHandlerService } from './deletion-handler.service';
import { Post, PostDocument } from '../schemas/post.schema';

describe('DeletionHandlerService', () => {
  let service: DeletionHandlerService;
  let postModel: Model<PostDocument>;

  const mockPostModel = {
    updateMany: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeletionHandlerService,
        {
          provide: getModelToken(Post.name),
          useValue: mockPostModel,
        },
      ],
    }).compile();

    service = module.get<DeletionHandlerService>(DeletionHandlerService);
    postModel = module.get<Model<PostDocument>>(getModelToken(Post.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('anonymizeUserPosts', () => {
    it('should anonymize all posts by deleted user', async () => {
      // Arrange
      const userId = 'test-user-id';
      const mockUpdateResult = { modifiedCount: 5 };

      mockPostModel.updateMany.mockResolvedValue(mockUpdateResult);

      // Act
      const result = await service.anonymizeUserPosts(userId);

      // Assert
      expect(postModel.updateMany).toHaveBeenCalledWith(
        { authorId: userId },
        {
          $set: {
            authorDeleted: true,
            authorDeletedAt: expect.any(Date),
            author: 'Deleted User',
          },
        },
      );
      expect(result).toBe(5);
    });

    it('should return 0 if no posts found for user', async () => {
      // Arrange
      mockPostModel.updateMany.mockResolvedValue({ modifiedCount: 0 });

      // Act
      const result = await service.anonymizeUserPosts('test-user-id');

      // Assert
      expect(result).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockPostModel.updateMany.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.anonymizeUserPosts('test-user-id'))
        .rejects.toThrow('Database error');
    });
  });

  describe('getPostCountByUser', () => {
    it('should return count of posts by user', async () => {
      // Arrange
      mockPostModel.countDocuments.mockResolvedValue(10);

      // Act
      const result = await service.getPostCountByUser('test-user-id');

      // Assert
      expect(postModel.countDocuments).toHaveBeenCalledWith({
        authorId: 'test-user-id',
      });
      expect(result).toBe(10);
    });

    it('should return 0 if user has no posts', async () => {
      // Arrange
      mockPostModel.countDocuments.mockResolvedValue(0);

      // Act
      const result = await service.getPostCountByUser('test-user-id');

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('getPostsByUser', () => {
    it('should return all posts by user', async () => {
      // Arrange
      const mockPosts = [
        { _id: 'post-1', title: 'Test Post 1', authorId: 'test-user-id' },
        { _id: 'post-2', title: 'Test Post 2', authorId: 'test-user-id' },
      ];

      mockPostModel.find.mockResolvedValue(mockPosts);

      // Act
      const result = await service.getPostsByUser('test-user-id');

      // Assert
      expect(postModel.find).toHaveBeenCalledWith({
        authorId: 'test-user-id',
      });
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Test Post 1');
    });

    it('should return empty array if user has no posts', async () => {
      // Arrange
      mockPostModel.find.mockResolvedValue([]);

      // Act
      const result = await service.getPostsByUser('test-user-id');

      // Assert
      expect(result).toHaveLength(0);
    });
  });
});
