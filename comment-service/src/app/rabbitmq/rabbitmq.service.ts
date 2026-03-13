import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import {
  RABBITMQ_URI_KEY,
  RABBITMQ_DEFAULT_URI,
} from './rabbitmq.constants';
import { PostComment } from '@prueba-tecnica-fullstack-angular-nest-js-mongo-db/shared-types';

/**
 * RabbitMQ service for Comment Service.
 * Primarily used for event publishing (comment.created, comment.updated, comment.deleted events).
 */
@Injectable()
export class RabbitmqService implements OnModuleInit {
  private readonly logger = new Logger(RabbitmqService.name);
  private client: ClientProxy;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const rabbitmqUri = this.configService.get<string>(RABBITMQ_URI_KEY) || RABBITMQ_DEFAULT_URI;

    // Single client for all comment events
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUri],
        queue: 'comment.events',
        queueOptions: { durable: true },
      },
    });

    try {
      await this.client.connect();
      this.logger.log('✅ RabbitMQ event producer connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect RabbitMQ event producer:', error);
    }
  }

  /**
   * Emit comment.created event with full recentComments array.
   * @param postId - The post ID
   * @param commentId - The created comment ID
   * @param recentComments - Top 10 recent comments for the post
   * @param tempId - Optional tempId for pending write confirmation
   */
  async emitCommentCreated(postId: string, commentId: string, recentComments: PostComment[], tempId?: string) {
    try {
      console.log('[Comment Service] Emitting comment.created with tempId:', tempId);
      this.client.emit('comment.created', { postId, commentId, recentComments, tempId });
      this.logger.log(`📤 Emitted comment.created event for comment: ${commentId}, tempId: ${tempId}`);
    } catch (error) {
      this.logger.error('Failed to emit comment.created event:', error);
    }
  }

  /**
   * Emit comment.updated event with full recentComments array.
   * @param postId - The post ID
   * @param commentId - The updated comment ID
   * @param recentComments - Top 10 recent comments for the post
   */
  async emitCommentUpdated(postId: string, commentId: string, recentComments: PostComment[]) {
    try {
      this.client.emit('comment.updated', { postId, commentId, recentComments });
      this.logger.log(`📤 Emitted comment.updated event for comment: ${commentId}`);
    } catch (error) {
      this.logger.error('Failed to emit comment.updated event:', error);
    }
  }

  /**
   * Emit comment.deleted event with full recentComments array.
   * @param postId - The post ID
   * @param commentId - The deleted comment ID
   * @param recentComments - Top 10 recent comments for the post (after deletion)
   */
  async emitCommentDeleted(postId: string, commentId: string, recentComments: PostComment[]) {
    try {
      this.client.emit('comment.deleted', { postId, commentId, recentComments });
      this.logger.log(`📤 Emitted comment.deleted event for comment: ${commentId}`);
    } catch (error) {
      this.logger.error('Failed to emit comment.deleted event:', error);
    }
  }

  /**
   * Emit comment.create.failed event with error message.
   * @param tempId - The tempId of the failed comment
   * @param error - The error message
   */
  async emitCommentCreateFailed(tempId: string, error: string) {
    try {
      this.client.emit('comment.create.failed', { tempId, error });
      this.logger.log(`📤 Emitted comment.create.failed event for tempId: ${tempId}`);
    } catch (err) {
      this.logger.error('Failed to emit comment.create.failed event:', err);
    }
  }

  /**
   * Emit comment.sync event with full recentComments array for recovery sync.
   * @param postId - The post ID
   * @param recentComments - Top 10 recent comments for the post
   */
  async emitCommentSync(postId: string, recentComments: PostComment[]) {
    try {
      this.client.emit('comment.sync', { postId, recentComments });
      this.logger.log(`📤 Emitted comment.sync event for post: ${postId}`);
    } catch (error) {
      this.logger.error('Failed to emit comment.sync event:', error);
    }
  }
}
