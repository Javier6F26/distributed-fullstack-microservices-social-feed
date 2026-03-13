/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PostsService } from './posts.service';
import { Post, PostDocument } from '../schemas/post.schema';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

/**
 * Minimal Unit Tests for PostsService
 *
 * Tests post business logic with mocked dependencies.
 * MongoDB and RabbitMQ are mocked for fast, isolated execution.
 */

describe('PostsService (Unit)', () => {
  let postsService: PostsService;
  let mockPostModel: jest.Mocked<Model<PostDocument>>;
  let mockRabbitmqService: jest.Mocked<RabbitmqService>;

  beforeEach(async () => {
    mockPostModel = {
      findOne: jest.fn() as any,
      find: jest.fn() as any,
      findOneAndUpdate: jest.fn() as any,
      insertMany: jest.fn() as any,
    } as jest.Mocked<Model<PostDocument>>;

    mockRabbitmqService = {
      emitPostCreated: jest.fn(),
      emitPostCreateFailed: jest.fn(),
      emitPostUpdated: jest.fn(),
      emitPostDeleted: jest.fn(),
    } as jest.Mocked<RabbitmqService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: getModelToken(Post.name),
          useValue: mockPostModel,
        },
        {
          provide: RabbitmqService,
          useValue: mockRabbitmqService,
        },
      ],
    }).compile();

    postsService = module.get<PostsService>(PostsService);
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('[P0] should return post when found by id', async () => {
      // Arrange
      const postId = new Types.ObjectId().toString();
      const mockPost = {
        _id: new Types.ObjectId(postId),
        title: 'Test Post',
        body: 'Test content',
        authorId: new Types.ObjectId(),
        deleted: false,
      };
      mockPostModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockPost) } as any);

      // Act
      const result = await postsService.findOne(postId);

      // Assert
      expect(result).toEqual(mockPost);
      expect(mockPostModel.findOne).toHaveBeenCalledWith({ _id: postId, deleted: false });
    });

    it('[P2] should return null when post not found', async () => {
      // Arrange
      const postId = new Types.ObjectId().toString();
      mockPostModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) } as any);

      // Act
      const result = await postsService.findOne(postId);

      // Assert
      expect(result).toBeNull();
    });

    it('[P1] should throw BadRequestException for invalid ObjectId', async () => {
      // Arrange
      const invalidId = 'invalid-id';

      // Act & Assert
      await expect(postsService.findOne(invalidId))
        .rejects
        .toThrow(BadRequestException);
      
      await expect(postsService.findOne(invalidId))
        .rejects
        .toThrow('Invalid postId');
    });
  });

  describe('findAll', () => {
    it('[P0] should return posts with pagination', async () => {
      // Arrange
      const mockPosts = [
        { _id: new Types.ObjectId(), title: 'Post 1', deleted: false },
        { _id: new Types.ObjectId(), title: 'Post 2', deleted: false },
      ];
      mockPostModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPosts),
          }),
        }),
      } as any);

      // Act
      const result = await postsService.findAll(2);

      // Assert
      expect(result.posts).toHaveLength(2);
      expect(result.nextCursor).toBe(mockPosts[mockPosts.length - 1]._id.toString());
    });

    it('[P0] should return null nextCursor when no more posts', async () => {
      // Arrange
      const mockPosts = [
        { _id: new Types.ObjectId(), title: 'Post 1', deleted: false },
      ];
      mockPostModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPosts),
          }),
        }),
      } as any);

      // Act
      const result = await postsService.findAll(2);

      // Assert
      expect(result.posts).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it('[P1] should throw BadRequestException for invalid cursor', async () => {
      // Arrange
      const invalidCursor = 'invalid-cursor';

      // Act & Assert
      await expect(postsService.findAll(10, invalidCursor))
        .rejects
        .toThrow(BadRequestException);
      
      await expect(postsService.findAll(10, invalidCursor))
        .rejects
        .toThrow('Invalid cursor format');
    });
  });

  describe('updatePost', () => {
    it('[P0] should update post successfully', async () => {
      // Arrange
      const postId = new Types.ObjectId().toString();
      const updates = { title: 'Updated Title' };
      const updatedPost = {
        _id: new Types.ObjectId(postId),
        title: 'Updated Title',
        body: 'Original body',
        deleted: false,
      };
      mockPostModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedPost),
      } as any);

      // Act
      const result = await postsService.updatePost(postId, updates);

      // Assert
      expect(result.title).toBe('Updated Title');
      expect(mockPostModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: postId, deleted: false },
        { $set: updates },
        { returnDocument: 'after' },
      );
    });

    it('[P1] should throw NotFoundException when post not found', async () => {
      // Arrange
      const postId = new Types.ObjectId().toString();
      mockPostModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      // Act & Assert
      await expect(postsService.updatePost(postId, { title: 'Updated' }))
        .rejects
        .toThrow(NotFoundException);
    });

    it('[P1] should throw BadRequestException for invalid postId', async () => {
      // Arrange
      const invalidId = 'invalid-id';

      // Act & Assert
      await expect(postsService.updatePost(invalidId, { title: 'Updated' }))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('deletePost', () => {
    it('[P0] should soft delete post successfully', async () => {
      // Arrange
      const postId = new Types.ObjectId().toString();
      const deletedPost = {
        _id: new Types.ObjectId(postId),
        title: 'Test Post',
        deleted: true,
        deletedAt: new Date(),
      };
      mockPostModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(deletedPost),
      } as any);

      // Act
      const result = await postsService.deletePost(postId);

      // Assert
      expect(result.deleted).toBe(true);
      expect(result.deletedAt).toEqual(new Date());
    });

    it('[P1] should throw NotFoundException when post already deleted', async () => {
      // Arrange
      const postId = new Types.ObjectId().toString();
      mockPostModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      // Act & Assert
      await expect(postsService.deletePost(postId))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('bulkCreatePosts', () => {
    it('[P0] should create posts successfully', async () => {
      // Arrange
      const postsData = [
        { authorId: new Types.ObjectId().toString(), author: 'Author 1', title: 'Post 1', body: 'Content 1' },
        { authorId: new Types.ObjectId().toString(), author: 'Author 2', title: 'Post 2', body: 'Content 2' },
      ];
      const createdPosts = [
        { _id: new Types.ObjectId(), authorId: postsData[0].authorId, title: 'Post 1', author: 'Author 1' },
        { _id: new Types.ObjectId(), authorId: postsData[1].authorId, title: 'Post 2', author: 'Author 2' },
      ];

      mockPostModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) } as any);
      mockPostModel.insertMany.mockResolvedValue(createdPosts as any);

      // Act
      const result = await postsService.bulkCreatePosts(postsData);

      // Assert
      expect(result.created).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('[P1] should skip duplicate posts', async () => {
      // Arrange
      const postsData = [
        { authorId: new Types.ObjectId().toString(), author: 'Author 1', title: 'Duplicate Post', body: 'Content' },
      ];
      const existingPost = { _id: new Types.ObjectId(), title: 'Duplicate Post' };

      mockPostModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(existingPost) } as any);

      // Act
      const result = await postsService.bulkCreatePosts(postsData);

      // Assert
      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('Post with same title already exists for this author');
    });

    it('[P1] should skip posts with invalid authorId', async () => {
      // Arrange
      const postsData = [
        { authorId: 'invalid-id', author: 'Author 1', title: 'Post 1', body: 'Content' },
      ];

      // Act
      const result = await postsService.bulkCreatePosts(postsData);

      // Assert
      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('Invalid authorId format');
    });

    it('[P2] should handle insert errors gracefully', async () => {
      // Arrange
      const postsData = [
        { authorId: new Types.ObjectId().toString(), author: 'Author 1', title: 'Post 1', body: 'Content' },
      ];
      const mockWriteError = { index: 0, errmsg: 'Duplicate key error' };

      mockPostModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) } as any);
      mockPostModel.insertMany.mockRejectedValue({
        message: 'Bulk insert failed',
        writeErrors: [mockWriteError],
      } as any);

      // Act
      const result = await postsService.bulkCreatePosts(postsData);

      // Assert
      expect(result.created).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Duplicate key error');
    });
  });
});
