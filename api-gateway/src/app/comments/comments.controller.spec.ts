import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios';
import { CommentsController } from './comments.controller';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentCreateMessage } from '@prueba-tecnica-fullstack-angular-nest-js-mongo-db/shared-types';

describe('CommentsController', () => {
  let controller: CommentsController;
  let rabbitmqService: RabbitmqService;

  const mockRabbitmqService = {
    publishCommentCreate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        CacheModule.register({ isGlobal: true }),
        HttpModule,
      ],
      controllers: [CommentsController],
      providers: [
        {
          provide: RabbitmqService,
          useValue: mockRabbitmqService,
        },
      ],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    rabbitmqService = module.get<RabbitmqService>(RabbitmqService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createComment', () => {
    const mockDto: CreateCommentDto = {
      postId: 'post-123',
      body: 'This is a test comment',
    };

    const mockRequest = {
      user: {
        userId: 'user-123',
        username: 'testuser',
        avatar: 'avatar-url',
      },
    };

    it('should create a comment successfully', async () => {
      mockRabbitmqService.publishCommentCreate.mockResolvedValue(true);

      const result = await controller.createComment(mockDto, mockRequest as any);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Comment created successfully');
      expect(result.data).toBeDefined();
      expect(result.data?.pending).toBe(true);
      expect(rabbitmqService.publishCommentCreate).toHaveBeenCalledTimes(1);
    });

    it('should return validation error for empty body', async () => {
      const invalidDto: CreateCommentDto = {
        postId: 'post-123',
        body: '',
      };

      const result = await controller.createComment(invalidDto, mockRequest as any);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Validation failed');
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should return validation error for missing postId', async () => {
      const invalidDto: any = {
        body: 'This is a test comment',
      };

      const result = await controller.createComment(invalidDto, mockRequest as any);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Validation failed');
    });

    it('should return validation error for body exceeding 1000 characters', async () => {
      const invalidDto: CreateCommentDto = {
        postId: 'post-123',
        body: 'a'.repeat(1001),
      };

      const result = await controller.createComment(invalidDto, mockRequest as any);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Validation failed');
      expect(result.errors?.some(e => e.field === 'body')).toBe(true);
    });

    it('should return unauthorized error if userId is missing', async () => {
      const invalidRequest = {
        user: {
          username: 'testuser',
        },
      };

      const result = await controller.createComment(mockDto, invalidRequest as any);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User ID not found in token');
      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should return unauthorized error if username is missing', async () => {
      const invalidRequest = {
        user: {
          userId: 'user-123',
        },
      };

      const result = await controller.createComment(mockDto, invalidRequest as any);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Username not found in token');
      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should return service unavailable error on RabbitMQ failure', async () => {
      mockRabbitmqService.publishCommentCreate.mockRejectedValue(new Error('RabbitMQ connection failed'));

      const result = await controller.createComment(mockDto, mockRequest as any);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Comment creation service temporarily unavailable');
      expect(result.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('should include tempId in optimistic response', async () => {
      mockRabbitmqService.publishCommentCreate.mockResolvedValue(true);

      const result = await controller.createComment(mockDto, mockRequest as any);

      expect(result.data?._id).toBeDefined();
      expect(result.data?._id).toMatch(/^temp_\d+_[a-z0-9]+$/);
      expect(result.data?.tempId).toBeDefined();
    });

    it('should include author info from JWT in message', async () => {
      mockRabbitmqService.publishCommentCreate.mockResolvedValue(true);

      await controller.createComment(mockDto, mockRequest as any);

      const publishedMessage: CommentCreateMessage = mockRabbitmqService.publishCommentCreate.mock.calls[0][0];
      expect(publishedMessage.authorUsername).toBe('testuser');
      expect(publishedMessage.authorAvatar).toBe('avatar-url');
      expect(publishedMessage.userId).toBe('user-123');
    });
  });

  describe('getPostComments', () => {
    it('should be defined', () => {
      expect(controller.getPostComments).toBeDefined();
    });
  });

  describe('getRecentComments', () => {
    it('should be defined', () => {
      expect(controller.getRecentComments).toBeDefined();
    });
  });

  describe('invalidateCache', () => {
    it('should be defined', () => {
      expect(controller.invalidateCache).toBeDefined();
    });
  });
});
