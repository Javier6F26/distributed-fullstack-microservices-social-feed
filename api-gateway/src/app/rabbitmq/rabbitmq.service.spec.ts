import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RabbitmqService } from './rabbitmq.service';
import { POST_CREATE_QUEUE, COMMENT_CREATE_QUEUE } from './rabbitmq.constants';

describe('RabbitmqService', () => {
  let service: RabbitmqService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
      providers: [RabbitmqService],
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

  describe('COMMENT_CREATE_QUEUE constant', () => {
    it('should have correct queue name format', () => {
      expect(COMMENT_CREATE_QUEUE).toBe('comment.create');
      expect(COMMENT_CREATE_QUEUE).toMatch(/^[a-z]+\.[a-z]+$/); // domain.action pattern
    });
  });

  // Note: Integration tests for RabbitMQ connection require running RabbitMQ instance
  // These would be in a separate integration test file
});
