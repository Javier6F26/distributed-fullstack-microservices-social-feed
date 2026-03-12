import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { PostsController } from './posts.controller';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { CreatePostDto } from './dto/create-post.dto';
import { HttpStatus } from '@nestjs/common';

describe('PostsController - Create Post', () => {
  let controller: PostsController;
  let rabbitmqService: Partial<RabbitmqService>;

  const mockRabbitmqService = {
    publishPostCreate: jest.fn().mockResolvedValue(true),
    isConnected: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        HttpModule,
        ConfigModule.forRoot({ isGlobal: true }),
        CacheModule.register({ isGlobal: true }),
      ],
      controllers: [PostsController],
      providers: [
        {
          provide: RabbitmqService,
          useValue: mockRabbitmqService,
        },
      ],
    }).compile();

    controller = module.get<PostsController>(PostsController);
    rabbitmqService = module.get<RabbitmqService>(RabbitmqService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPost', () => {
    const validDto: CreatePostDto = {
      title: 'Valid Post Title',
      body: 'This is a valid post body with enough characters.',
    };

    it('should create a post successfully with valid data', async () => {
      const req = { user: { userId: 'test-user-123' } };
      
      const result = await (controller as any).createPost(validDto, req);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Post created successfully');
      expect(result.data).toHaveProperty('userId', 'test-user-123');
      expect(result.data).toHaveProperty('title', validDto.title);
      expect(result.data).toHaveProperty('body', validDto.body);
      expect(result.data).toHaveProperty('pending', true);
      expect(result.data).toHaveProperty('tempId');
      expect(mockRabbitmqService.publishPostCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-123',
          title: validDto.title,
          body: validDto.body,
        }),
      );
    });

    it('should return validation error when title is too short', async () => {
      const invalidDto: CreatePostDto = {
        title: 'Short',
        body: 'This is a valid post body with enough characters.',
      };
      const req = { user: { userId: 'test-user-123' } };

      const result = await (controller as any).createPost(invalidDto, req);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Validation failed');
      expect(result.status).toBe(HttpStatus.BAD_REQUEST);
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return validation error when body is too short', async () => {
      const invalidDto: CreatePostDto = {
        title: 'Valid Post Title',
        body: 'Short',
      };
      const req = { user: { userId: 'test-user-123' } };

      const result = await (controller as any).createPost(invalidDto, req);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Validation failed');
      expect(result.status).toBe(HttpStatus.BAD_REQUEST);
      expect(result.errors).toBeInstanceOf(Array);
    });

    it('should return validation error when title is missing', async () => {
      const invalidDto: any = {
        body: 'This is a valid post body with enough characters.',
      };
      const req = { user: { userId: 'test-user-123' } };

      const result = await (controller as any).createPost(invalidDto, req);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Validation failed');
      expect(result.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should return validation error when body is missing', async () => {
      const invalidDto: any = {
        title: 'Valid Post Title',
      };
      const req = { user: { userId: 'test-user-123' } };

      const result = await (controller as any).createPost(invalidDto, req);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Validation failed');
      expect(result.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should return unauthorized when user ID is missing from token', async () => {
      const req = { user: {} }; // No userId or sub

      const result = await (controller as any).createPost(validDto, req);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User ID not found in token');
      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should handle RabbitMQ service error', async () => {
      mockRabbitmqService.publishPostCreate.mockRejectedValueOnce(new Error('RabbitMQ connection failed'));
      
      const req = { user: { userId: 'test-user-123' } };

      const result = await (controller as any).createPost(validDto, req);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Post creation service temporarily unavailable');
      expect(result.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });
  });
});
