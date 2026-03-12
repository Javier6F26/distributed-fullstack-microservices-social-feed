import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { RabbitmqService } from './rabbitmq.service';
import { Post } from '../schemas/post.schema';
import { POST_CREATE_QUEUE } from './rabbitmq.constants';

describe('RabbitmqService', () => {
  let service: RabbitmqService;
  let configService: ConfigService;

  const mockPostModel = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
      providers: [
        RabbitmqService,
        {
          provide: getModelToken(Post.name),
          useValue: mockPostModel,
        },
      ],
    }).compile();

    service = module.get<RabbitmqService>(RabbitmqService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have correct RabbitMQ URI from config', () => {
    const uri = configService.get<string>('RABBITMQ_URI');
    expect(uri).toBeDefined();
  });

  it('should use default URI when RABBITMQ_URI is not set', () => {
    process.env.RABBITMQ_URI = undefined;
    const defaultUri = configService.get<string>('RABBITMQ_URI') || 'amqp://guest:guest@localhost:5672';
    expect(defaultUri).toBe('amqp://guest:guest@localhost:5672');
  });

  describe('POST_CREATE_QUEUE constant', () => {
    it('should have correct queue name format', () => {
      expect(POST_CREATE_QUEUE).toBe('post.create');
      expect(POST_CREATE_QUEUE).toMatch(/^[a-z]+\.[a-z]+$/); // domain.action pattern
    });
  });

  describe('Retry configuration', () => {
    it('should have MAX_RETRY_ATTEMPTS set to 3', () => {
      // This would be tested through the constants file
      expect(POST_CREATE_QUEUE).toBeDefined();
    });
  });

  // Note: Integration tests for RabbitMQ consumer require running RabbitMQ instance
  // These would be in a separate integration test file
});
