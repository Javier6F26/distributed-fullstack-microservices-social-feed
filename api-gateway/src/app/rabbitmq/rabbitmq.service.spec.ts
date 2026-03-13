/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices';
import { RabbitmqService } from './rabbitmq.service';
import { of, throwError } from 'rxjs';
import { POST_CREATE_QUEUE, COMMENT_CREATE_QUEUE } from './rabbitmq.constants';

/**
 * Minimal Unit Tests for RabbitmqService (API Gateway)
 * 
 * Tests RabbitMQ message publishing with mocked clients.
 */

describe('RabbitmqService (Unit)', () => {
  let rabbitmqService: RabbitmqService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockPostClient: jest.Mocked<ClientProxy>;
  let mockCommentClient: jest.Mocked<ClientProxy>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn(),
    } as jest.Mocked<ConfigService>;

    mockPostClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
    } as jest.Mocked<ClientProxy>;

    mockCommentClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
    } as jest.Mocked<ClientProxy>;

    // Mock ClientProxyFactory
    jest.spyOn(ClientProxyFactory, 'create').mockImplementation((options) => {
      const queue = options?.options?.queue;
      if (queue === POST_CREATE_QUEUE) {
        return mockPostClient as any;
      }
      return mockCommentClient as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitmqService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    rabbitmqService = module.get<RabbitmqService>(RabbitmqService);
    
    // Trigger onModuleInit manually for testing
    await rabbitmqService.onModuleInit();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publishPostCreate', () => {
    it('[P0] should publish message to POST_CREATE_QUEUE successfully', async () => {
      // Arrange
      const message = {
        tempId: 'temp-123',
        userId: 'user-456',
        author: 'Test Author',
        title: 'Test Post',
        body: 'Test content',
        createdAt: new Date(),
      };
      mockPostClient.emit.mockReturnValue(of({}) as any);

      // Act
      const result = rabbitmqService.publishPostCreate(message);

      // Assert
      expect(result).toBeDefined();
      expect(mockPostClient.emit).toHaveBeenCalledWith(POST_CREATE_QUEUE, message);
    });

    it('[P1] should handle publish error gracefully', async () => {
      // Arrange
      const message = {
        tempId: 'temp-123',
        userId: 'user-456',
        author: 'Test Author',
        title: 'Test Post',
        body: 'Test content',
        createdAt: new Date(),
      };
      mockPostClient.emit.mockReturnValue(throwError(() => new Error('Queue unavailable')) as any);

      // Act
      const result = rabbitmqService.publishPostCreate(message);

      // Assert
      expect(result).toBeDefined();
      expect(mockPostClient.emit).toHaveBeenCalledWith(POST_CREATE_QUEUE, message);
    });

    it('[P0] should include all required fields in message', async () => {
      // Arrange
      const message = {
        tempId: 'temp-123',
        userId: 'user-456',
        author: 'Test Author',
        title: 'Test Post',
        body: 'Test content',
        createdAt: new Date('2024-01-01'),
      };
      mockPostClient.emit.mockReturnValue(of({}) as any);

      // Act
      rabbitmqService.publishPostCreate(message);

      // Assert
      expect(mockPostClient.emit).toHaveBeenCalledWith(
        POST_CREATE_QUEUE,
        expect.objectContaining({
          tempId: 'temp-123',
          userId: 'user-456',
          author: 'Test Author',
          title: 'Test Post',
          body: 'Test content',
        }),
      );
    });
  });

  describe('publishCommentCreate', () => {
    it('[P0] should publish message to COMMENT_CREATE_QUEUE successfully', async () => {
      // Arrange
      const message = {
        tempId: 'temp-789',
        postId: 'post-123',
        authorId: 'user-456',
        name: 'Test User',
        email: 'test@example.com',
        body: 'Test comment',
        createdAt: new Date(),
      };
      mockCommentClient.emit.mockReturnValue(of({}) as any);

      // Act
      const result = rabbitmqService.publishCommentCreate(message);

      // Assert
      expect(result).toBeDefined();
      expect(mockCommentClient.emit).toHaveBeenCalledWith(COMMENT_CREATE_QUEUE, message);
    });

    it('[P1] should handle comment publish error gracefully', async () => {
      // Arrange
      const message = {
        tempId: 'temp-789',
        postId: 'post-123',
        authorId: 'user-456',
        name: 'Test User',
        email: 'test@example.com',
        body: 'Test comment',
        createdAt: new Date(),
      };
      mockCommentClient.emit.mockReturnValue(throwError(() => new Error('Queue unavailable')) as any);

      // Act
      const result = rabbitmqService.publishCommentCreate(message);

      // Assert
      expect(result).toBeDefined();
      expect(mockCommentClient.emit).toHaveBeenCalledWith(COMMENT_CREATE_QUEUE, message);
    });

    it('[P0] should include all required fields in comment message', async () => {
      // Arrange
      const message = {
        tempId: 'temp-789',
        postId: 'post-123',
        authorId: 'user-456',
        name: 'Test User',
        email: 'test@example.com',
        body: 'Test comment',
        createdAt: new Date('2024-01-01'),
      };
      mockCommentClient.emit.mockReturnValue(of({}) as any);

      // Act
      rabbitmqService.publishCommentCreate(message);

      // Assert
      expect(mockCommentClient.emit).toHaveBeenCalledWith(
        COMMENT_CREATE_QUEUE,
        expect.objectContaining({
          tempId: 'temp-789',
          postId: 'post-123',
          authorId: 'user-456',
          name: 'Test User',
          email: 'test@example.com',
          body: 'Test comment',
        }),
      );
    });
  });

  describe('onModuleInit', () => {
    it('[P0] should connect to RabbitMQ on module init', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('amqp://localhost:5672');
      const newModule: TestingModule = await Test.createTestingModule({
        providers: [
          RabbitmqService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const service = newModule.get<RabbitmqService>(RabbitmqService);
      
      // Act
      await service.onModuleInit();

      // Assert
      expect(mockPostClient.connect).toHaveBeenCalled();
      expect(mockCommentClient.connect).toHaveBeenCalled();
    });

    it('[P2] should use default URI when RABBITMQ_URI is not configured', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue(undefined);
      const newModule: TestingModule = await Test.createTestingModule({
        providers: [
          RabbitmqService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const service = newModule.get<RabbitmqService>(RabbitmqService);
      
      // Act
      await service.onModuleInit();

      // Assert
      expect(ClientProxyFactory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            urls: [expect.any(String)],
          }),
        }),
      );
    });
  });
});
