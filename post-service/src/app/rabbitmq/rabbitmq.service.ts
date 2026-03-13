import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import {
  RABBITMQ_URI_KEY,
  RABBITMQ_DEFAULT_URI,
  POST_UPDATED_EVENT,
  POST_DELETED_EVENT,
} from './rabbitmq.constants';

/**
 * RabbitMQ service for producing messages in Post Service.
 * Handles connection to RabbitMQ for event publishing.
 */
@Injectable()
export class RabbitmqService implements OnModuleInit {
  private readonly logger = new Logger(RabbitmqService.name);
  private client: ClientProxy;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const rabbitmqUri = this.configService.get<string>(RABBITMQ_URI_KEY) || RABBITMQ_DEFAULT_URI;

    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUri],
        queue: 'post.events',
        queueOptions: {
          durable: true,
        },
      },
    });

    try {
      await this.client.connect();
      this.logger.log('✅ RabbitMQ event producer connected successfully');
    } catch (error: any) {
      this.logger.error('❌ RabbitMQ connection failed:', error.message);
    }
  }

  /**
   * Emit post.created event to event queue.
   * @param payload - Event payload
   */
  async emitPostCreated(payload: { postId: string; userId: string; tempId?: string }) {
    try {
      this.client.emit('post.created', payload);
      this.logger.log(`📤 Emitted post.created event for tempId: ${payload.tempId}`);
    } catch (error) {
      this.logger.error('Failed to emit post.created event:', error.message);
    }
  }

  /**
   * Emit post.create.failed event to event queue.
   * @param payload - Event payload with tempId and error message
   */
  async emitPostCreateFailed(payload: { tempId: string; error: string }) {
    try {
      this.client.emit('post.create.failed', payload);
      this.logger.log(`📤 Emitted post.create.failed event for tempId: ${payload.tempId}`);
    } catch (error) {
      this.logger.error('Failed to emit post.create.failed event:', error.message);
    }
  }

  /**
   * Emit post.updated event to event queue.
   * @param postId - The updated post ID
   * @param post - The updated post document
   */
  async emitPostUpdated(postId: string, post: any) {
    try {
      this.client.emit(POST_UPDATED_EVENT, { postId, post });
      this.logger.log(`📤 Emitted post.updated event for post: ${postId}`);
    } catch (error) {
      this.logger.error('Failed to emit post.updated event:', error.message);
    }
  }

  /**
   * Emit post.deleted event to event queue.
   * @param postId - The deleted post ID
   */
  async emitPostDeleted(postId: string) {
    try {
      this.client.emit(POST_DELETED_EVENT, { postId });
      this.logger.log(`📤 Emitted post.deleted event for post: ${postId}`);
    } catch (error) {
      this.logger.error('Failed to emit post.deleted event:', error.message);
    }
  }
}
