import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CommentsService } from './comments.service';
import { Comment, CommentDocument } from '../schemas/comment.schema';
import { CommentCreateMessage } from '@prueba-tecnica-fullstack-angular-nest-js-mongo-db/shared-types';

describe('CommentsService', () => {
  let service: CommentsService;
  let commentModel: Model<CommentDocument>;

  const mockComment = {
    _id: new Types.ObjectId(),
    postId: 'post-123',
    userId: 'user-123',
    authorUsername: 'testuser',
    authorAvatar: 'avatar-url',
    body: 'This is a test comment',
    createdAt: new Date().toISOString(),
    deleted: false,
    save: jest.fn().mockResolvedValue({
      _id: new Types.ObjectId(),
      postId: 'post-123',
      userId: 'user-123',
      authorUsername: 'testuser',
      authorAvatar: 'avatar-url',
      body: 'This is a test comment',
      createdAt: new Date().toISOString(),
      deleted: false,
    }),
  };

  const mockCommentModel = {
    new: jest.fn(() => mockComment),
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([mockComment]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getModelToken(Comment.name),
          useValue: mockCommentModel,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    commentModel = module.get<Model<CommentDocument>>(getModelToken(Comment.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCommentFromQueue', () => {
    const mockMessage: CommentCreateMessage = {
      postId: 'post-123',
      userId: 'user-123',
      authorUsername: 'testuser',
      authorAvatar: 'avatar-url',
      body: 'This is a test comment',
      createdAt: new Date().toISOString(),
      tempId: 'temp-123',
    };

    it('should create a comment from queue message', async () => {
      const result = await service.createCommentFromQueue(mockMessage);

      expect(result).toBeDefined();
      expect(mockCommentModel.new).toHaveBeenCalledWith({
        postId: 'post-123',
        userId: 'user-123',
        authorUsername: 'testuser',
        authorAvatar: 'avatar-url',
        body: 'This is a test comment',
        createdAt: expect.any(String),
        deleted: false,
      });
    });

    it('should handle message without createdAt', async () => {
      const messageWithoutDate: CommentCreateMessage = {
        ...mockMessage,
        createdAt: undefined as any,
      };

      await service.createCommentFromQueue(messageWithoutDate);

      expect(mockCommentModel.new).toHaveBeenCalled();
    });

    it('should handle message without authorAvatar', async () => {
      const messageWithoutAvatar: CommentCreateMessage = {
        ...mockMessage,
        authorAvatar: undefined,
      };

      await service.createCommentFromQueue(messageWithoutAvatar);

      expect(mockCommentModel.new).toHaveBeenCalledWith({
        postId: 'post-123',
        userId: 'user-123',
        authorUsername: 'testuser',
        authorAvatar: undefined,
        body: 'This is a test comment',
        createdAt: expect.any(String),
        deleted: false,
      });
    });
  });

  describe('findByPostId', () => {
    it('should find recent comments for a post', async () => {
      const mockComments = [mockComment];
      mockCommentModel.exec.mockResolvedValue(mockComments);

      const result = await service.findByPostId('post-123', 4);

      expect(result).toEqual(mockComments);
      expect(commentModel.find).toHaveBeenCalledWith({ postId: 'post-123', deleted: false });
      expect(commentModel.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(commentModel.limit).toHaveBeenCalledWith(4);
    });

    it('should use default limit of 4', async () => {
      const mockComments = [mockComment];
      mockCommentModel.exec.mockResolvedValue(mockComments);

      await service.findByPostId('post-123');

      expect(commentModel.limit).toHaveBeenCalledWith(4);
    });

    it('should filter out deleted comments', async () => {
      await service.findByPostId('post-123', 4);

      expect(commentModel.find).toHaveBeenCalledWith({ postId: 'post-123', deleted: false });
    });
  });

  describe('findAllByPostId', () => {
    it('should find all comments for a post', async () => {
      const mockComments = [mockComment];
      mockCommentModel.exec.mockResolvedValue(mockComments);

      const result = await service.findAllByPostId('post-123');

      expect(result).toEqual(mockComments);
      expect(commentModel.find).toHaveBeenCalledWith({ postId: 'post-123', deleted: false });
      expect(commentModel.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should filter out deleted comments', async () => {
      await service.findAllByPostId('post-123');

      expect(commentModel.find).toHaveBeenCalledWith({ postId: 'post-123', deleted: false });
    });
  });
});
