import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import {
  COMMENT_CREATED_EVENT,
  COMMENT_UPDATED_EVENT,
  COMMENT_DELETED_EVENT,
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
  private clientCreated: ClientProxy;
  private clientUpdated: ClientProxy;
  private clientDeleted: ClientProxy;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const rabbitmqUri = this.configService.get<string>(RABBITMQ_URI_KEY) || RABBITMQ_DEFAULT_URI;
    
    // Client for comment.created events
    this.clientCreated = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUri],
        queue: COMMENT_CREATED_EVENT,
        queueOptions: { durable: true },
      },
    });
    
    // Client for comment.updated events
    this.clientUpdated = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUri],
        queue: COMMENT_UPDATED_EVENT,
        queueOptions: { durable: true },
      },
    });
    
    // Client for comment.deleted events
    this.clientDeleted = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUri],
        queue: COMMENT_DELETED_EVENT,
        queueOptions: { durable: true },
      },
    });
    
    await Promise.all([
      this.clientCreated.connect(),
      this.clientUpdated.connect(),
      this.clientDeleted.connect(),
    ]);
    
    this.logger.log('✅ RabbitMQ event producers connected successfully');
  }

  /**
   * Emit comment.created event with full recentComments array.
   * @param postId - The post ID
   * @param commentId - The created comment ID
   * @param recentComments - Top 10 recent comments for the post
   */
  async emitCommentCreated(postId: string, commentId: string, recentComments: PostComment[]) {
    try {
      this.clientCreated.emit(COMMENT_CREATED_EVENT, { postId, commentId, recentComments });
      this.logger.log(`📤 Emitted ${COMMENT_CREATED_EVENT} for comment: ${commentId}`);
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
      this.clientUpdated.emit(COMMENT_UPDATED_EVENT, { postId, commentId, recentComments });
      this.logger.log(`📤 Emitted ${COMMENT_UPDATED_EVENT} for comment: ${commentId}`);
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
      this.clientDeleted.emit(COMMENT_DELETED_EVENT, { postId, commentId, recentComments });
      this.logger.log(`📤 Emitted ${COMMENT_DELETED_EVENT} for comment: ${commentId}`);
    } catch (error) {
      this.logger.error('Failed to emit comment.deleted event:', error);
    }
  }
}
