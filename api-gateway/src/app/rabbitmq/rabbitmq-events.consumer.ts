import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  RABBITMQ_URI_KEY,
  RABBITMQ_DEFAULT_URI,
} from './rabbitmq.constants';

/**
 * RabbitMQ Events Consumer for API Gateway.
 * Consumes post.created, post.create.failed, comment.created, comment.create.failed events
 * and updates the Redis cache for pending write tracking.
 */
@Injectable()
export class RabbitmqEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(RabbitmqEventsConsumer.name);
  private clientPost: ClientProxy;
  private clientComment: ClientProxy;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async onModuleInit() {
    const rabbitmqUri = this.configService.get<string>(RABBITMQ_URI_KEY) || RABBITMQ_DEFAULT_URI;

    // Client for post events
    this.clientPost = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUri],
        queue: 'post.events',
        queueOptions: { durable: true },
      },
    });

    // Client for comment events
    this.clientComment = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUri],
        queue: 'comment.events',
        queueOptions: { durable: true },
      },
    });

    try {
      await this.clientPost.connect();
      await this.clientComment.connect();
      this.logger.log('✅ RabbitMQ event consumers connected successfully');

      // Subscribe to post events
      this.clientPost.on('post.created', (payload: { tempId?: string }) => {
        this.handlePostCreated(payload);
      });
      this.clientPost.on('post.create.failed', (payload: { tempId: string; error: string }) => {
        this.handlePostCreateFailed(payload);
      });

      // Subscribe to comment events
      this.clientComment.on('comment.created', (payload: { tempId?: string }) => {
        this.handleCommentCreated(payload);
      });
      this.clientComment.on('comment.create.failed', (payload: { tempId: string; error: string }) => {
        this.handleCommentCreateFailed(payload);
      });
    } catch (error: any) {
      this.logger.error('❌ RabbitMQ event consumer connection failed:', error.message);
    }
  }

  /**
   * Handle post.created event - confirm pending write and store real postId
   */
  private async handlePostCreated(payload: { tempId?: string; postId?: string }) {
    if (!payload.tempId) {
      this.logger.warn('post.created event received without tempId');
      return;
    }

    try {
      // Store the real postId for the frontend to retrieve
      if (payload.postId) {
        await this.cacheManager.set(`post:tempId:${payload.tempId}`, payload.postId, 60000); // 60 seconds TTL
        this.logger.log(`✅ Stored postId ${payload.postId} for tempId: ${payload.tempId}`);
      }
      
      await this.cacheManager.del(`pending:${payload.tempId}`);
      await this.cacheManager.del(`pending:error:${payload.tempId}`);
      this.logger.log(`✅ Confirmed post write for tempId: ${payload.tempId}`);
    } catch (error: any) {
      this.logger.error(`Failed to confirm post write for tempId ${payload.tempId}:`, error.message);
    }
  }

  /**
   * Handle post.create.failed event - mark as error
   */
  private async handlePostCreateFailed(payload: { tempId: string; error: string }) {
    try {
      await this.cacheManager.set(`pending:${payload.tempId}`, 'error', 30000);
      await this.cacheManager.set(`pending:error:${payload.tempId}`, payload.error, 30000);
      this.logger.log(`❌ Marked post write as error for tempId: ${payload.tempId}`);
    } catch (error: any) {
      this.logger.error(`Failed to mark post write as error for tempId ${payload.tempId}:`, error.message);
    }
  }

  /**
   * Handle comment.created event - confirm pending write
   */
  private async handleCommentCreated(payload: { tempId?: string }) {
    console.log('[API Gateway] Received comment.created event:', payload);
    if (!payload.tempId) {
      this.logger.warn('comment.created event received without tempId');
      return;
    }

    try {
      await this.cacheManager.del(`pending:${payload.tempId}`);
      await this.cacheManager.del(`pending:error:${payload.tempId}`);
      this.logger.log(`✅ Confirmed comment write for tempId: ${payload.tempId}`);
    } catch (error: any) {
      this.logger.error(`Failed to confirm comment write for tempId ${payload.tempId}:`, error.message);
    }
  }

  /**
   * Handle comment.create.failed event - mark as error
   */
  private async handleCommentCreateFailed(payload: { tempId: string; error: string }) {
    console.log('[API Gateway] Received comment.create.failed event:', payload);
    try {
      await this.cacheManager.set(`pending:${payload.tempId}`, 'error', 30000);
      await this.cacheManager.set(`pending:error:${payload.tempId}`, payload.error, 30000);
      this.logger.log(`❌ Marked comment write as error for tempId: ${payload.tempId}`);
    } catch (error: any) {
      this.logger.error(`Failed to mark comment write as error for tempId ${payload.tempId}:`, error.message);
    }
  }
}
