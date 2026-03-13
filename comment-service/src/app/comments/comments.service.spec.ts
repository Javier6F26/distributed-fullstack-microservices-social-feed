/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CommentsService } from './comments.service';
import { Comment, CommentDocument } from '../schemas/comment.schema';
import {  NotFoundException } from '@nestjs/common';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

/**
 * Minimal Unit Tests for CommentsService
 *
 * Tests comment business logic with mocked dependencies.
 * MongoDB and RabbitMQ are mocked for fast, isolated execution.
 */

describe('CommentsService (Unit)', () => {
  let commentsService: CommentsService;
  let mockCommentModel: jest.Mocked<Model<CommentDocument>>;
  let mockRabbitmqService: jest.Mocked<RabbitmqService>;

  beforeEach(async () => {
    mockCommentModel = {
      findOne: jest.fn() as any,
      find: jest.fn() as any,
      findByIdAndUpdate: jest.fn() as any,
      findByIdAndDelete: jest.fn() as any,
      insertMany: jest.fn() as any,
    } as jest.Mocked<Model<CommentDocument>>;

    mockRabbitmqService = {
      emitCommentCreated: jest.fn(),
      emitCommentCreateFailed: jest.fn(),
      emitCommentUpdated: jest.fn(),
      emitCommentDeleted: jest.fn(),
    } as jest.Mocked<RabbitmqService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getModelToken(Comment.name),
          useValue: mockCommentModel,
        },
        {
          provide: RabbitmqService,
          useValue: mockRabbitmqService,
        },
      ],
    }).compile();

    commentsService = module.get<CommentsService>(CommentsService);
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('[P0] should return comment when found by id', async () => {
      // Arrange
      const commentId = new Types.ObjectId().toString();
      const mockComment = {
        _id: new Types.ObjectId(commentId),
        postId: new Types.ObjectId(),
        body: 'Test comment',
        authorId: 'author123',
      };
      mockCommentModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockComment) } as any);

      // Act
      const result = await commentsService.findOne(commentId);

      // Assert
      expect(result).toEqual(mockComment);
    });

    it('[P2] should return null when comment not found', async () => {
      // Arrange
      const commentId = new Types.ObjectId().toString();
      mockCommentModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) } as any);

      // Act
      const result = await commentsService.findOne(commentId);

      // Assert
      expect(result).toBeNull();
    });

    it('[P2] should return null for invalid commentId', async () => {
      // Arrange
      const invalidId = 'invalid-id';

      // Act
      const result = await commentsService.findOne(invalidId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByPostId', () => {
    it('[P0] should return recent comments for a post', async () => {
      // Arrange
      const postId = new Types.ObjectId().toString();
      const mockComments = [
        { _id: new Types.ObjectId(), postId, body: 'Comment 1' },
        { _id: new Types.ObjectId(), postId, body: 'Comment 2' },
      ];
      mockCommentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockComments),
          }),
        }),
      } as any);

      // Act
      const result = await commentsService.findByPostId(postId, 2);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockCommentModel.find).toHaveBeenCalledWith({ postId: expect.any(Types.ObjectId) });
    });

    it('[P0] should handle invalid postId gracefully', async () => {
      // Arrange
      const invalidPostId = 'invalid-id';
      mockCommentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      // Act
      const result = await commentsService.findByPostId(invalidPostId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('updateComment', () => {
    it('[P0] should update comment successfully', async () => {
      // Arrange
      const commentId = new Types.ObjectId().toString();
      const updates = { body: 'Updated comment' };
      const updatedComment = {
        _id: new Types.ObjectId(commentId),
        postId: new Types.ObjectId(),
        body: 'Updated comment',
      };
      mockCommentModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedComment),
      } as any);
      mockCommentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      // Act
      const result = await commentsService.updateComment(commentId, updates);

      // Assert
      expect(result.body).toBe('Updated comment');
      expect(mockCommentModel.findByIdAndUpdate).toHaveBeenCalledWith(
        commentId,
        updates,
        { new: true, timestamps: false },
      );
    });

    it('[P1] should throw NotFoundException when comment not found', async () => {
      // Arrange
      const commentId = new Types.ObjectId().toString();
      mockCommentModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      // Act & Assert
      await expect(commentsService.updateComment(commentId, { body: 'Updated' }))
        .rejects
        .toThrow(NotFoundException);

      await expect(commentsService.updateComment(commentId, { body: 'Updated' }))
        .rejects
        .toThrow(`Comment ${commentId} not found`);
    });
  });

  describe('deleteComment', () => {
    it('[P0] should delete comment successfully', async () => {
      // Arrange
      const commentId = new Types.ObjectId().toString();
      const deletedComment = {
        _id: new Types.ObjectId(commentId),
        postId: new Types.ObjectId(),
        body: 'Deleted comment',
      };
      mockCommentModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(deletedComment),
      } as any);
      mockCommentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      // Act
      const result = await commentsService.deleteComment(commentId);

      // Assert
      expect(result).toEqual(deletedComment);
      expect(mockCommentModel.findByIdAndDelete).toHaveBeenCalledWith(commentId);
    });

    it('[P1] should throw NotFoundException when comment not found', async () => {
      // Arrange
      const commentId = new Types.ObjectId().toString();
      mockCommentModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      // Act & Assert
      await expect(commentsService.deleteComment(commentId))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('bulkCreateComments', () => {
    it('[P0] should create comments successfully', async () => {
      // Arrange
      const commentsData = [
        { postId: new Types.ObjectId().toString(), authorId: 'author1', name: 'User 1', email: 'user1@test.com', body: 'Comment 1' },
        { postId: new Types.ObjectId().toString(), authorId: 'author2', name: 'User 2', email: 'user2@test.com', body: 'Comment 2' },
      ];
      const createdComments = [
        { _id: new Types.ObjectId(), postId: commentsData[0].postId, authorId: 'author1', name: 'User 1' },
        { _id: new Types.ObjectId(), postId: commentsData[1].postId, authorId: 'author2', name: 'User 2' },
      ];

      mockCommentModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) } as any);
      mockCommentModel.insertMany.mockResolvedValue(createdComments as any);

      // Act
      const result = await commentsService.bulkCreateComments(commentsData);

      // Assert
      expect(result.created).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('[P1] should skip duplicate comments', async () => {
      // Arrange
      const commentsData = [
        { postId: new Types.ObjectId().toString(), authorId: 'author1', name: 'User 1', email: 'user1@test.com', body: 'Duplicate comment' },
      ];
      const existingComment = { _id: new Types.ObjectId(), body: 'Duplicate comment' };

      mockCommentModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(existingComment) } as any);

      // Act
      const result = await commentsService.bulkCreateComments(commentsData);

      // Assert
      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('Duplicate comment (same post, author, and body)');
    });

    it('[P1] should skip comments with invalid postId', async () => {
      // Arrange
      const commentsData = [
        { postId: 'invalid-id', authorId: 'author1', name: 'User 1', email: 'user1@test.com', body: 'Comment 1' },
      ];

      // Act
      const result = await commentsService.bulkCreateComments(commentsData);

      // Assert
      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('Invalid postId format');
    });

    it('[P1] should skip comments with empty authorId', async () => {
      // Arrange
      const commentsData = [
        { postId: new Types.ObjectId().toString(), authorId: '', name: 'User 1', email: 'user1@test.com', body: 'Comment 1' },
      ];

      // Act
      const result = await commentsService.bulkCreateComments(commentsData);

      // Assert
      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('Invalid or empty authorId');
    });

    it('[P2] should handle insert errors gracefully', async () => {
      // Arrange
      const commentsData = [
        { postId: new Types.ObjectId().toString(), authorId: 'author1', name: 'User 1', email: 'user1@test.com', body: 'Comment 1' },
      ];
      const mockWriteError = { index: 0, errmsg: 'Insert failed' };

      mockCommentModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) } as any);
      mockCommentModel.insertMany.mockRejectedValue({
        message: 'Bulk insert failed',
        writeErrors: [mockWriteError],
      } as any);

      // Act
      const result = await commentsService.bulkCreateComments(commentsData);

      // Assert
      expect(result.created).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Insert failed');
    });
  });
});
