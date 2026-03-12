import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import {
  POST_CREATE_QUEUE,
  COMMENT_CREATE_QUEUE,
  RABBITMQ_URI_KEY,
  RABBITMQ_DEFAULT_URI,
  POST_CREATE_QUEUE_OPTIONS,
  COMMENT_CREATE_QUEUE_OPTIONS,
} from './rabbitmq.constants';
import { PostCreateMessage, CommentCreateMessage } from '@prueba-tecnica-fullstack-angular-nest-js-mongo-db/shared-types';
import { Observable } from 'rxjs';

/**
 * RabbitMQ service for producing messages to queues.
 * Handles connection to RabbitMQ and message publishing.
 */
@Injectable()
export class RabbitmqService implements OnModuleInit {
  private readonly logger = new Logger(RabbitmqService.name);
  private postClient!: ClientProxy;
  private commentClient!: ClientProxy;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const rabbitmqUri = this.configService.get<string>(RABBITMQ_URI_KEY) || RABBITMQ_DEFAULT_URI;

    // Initialize post queue client
    this.postClient = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUri],
        queue: POST_CREATE_QUEUE,
        queueOptions: POST_CREATE_QUEUE_OPTIONS,
      },
    });

    // Initialize comment queue client
    this.commentClient = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUri],
        queue: COMMENT_CREATE_QUEUE,
        queueOptions: COMMENT_CREATE_QUEUE_OPTIONS,
      },
    });

    try {
      await this.postClient.connect();
      this.logger.log('✅ RabbitMQ post queue connected successfully');
    } catch (error: any) {
      this.logger.error('❌ RabbitMQ post queue connection failed:', (error as Error).message);
      this.logger.warn('Ensure RabbitMQ is running: docker-compose up -d rabbitmq');
    }

    try {
      await this.commentClient.connect();
      this.logger.log('✅ RabbitMQ comment queue connected successfully');
    } catch (error: any) {
      this.logger.error('❌ RabbitMQ comment queue connection failed:', (error as Error).message);
      this.logger.warn('Ensure RabbitMQ is running: docker-compose up -d rabbitmq');
    }
  }

  /**
   * Publish a post creation message to the queue.
   * Uses emit() for fire-and-forget queue messages.
   * @param message - PostCreateMessage payload
   */
  publishPostCreate(message: PostCreateMessage): Observable<any> {
    this.logger.log(`📤 Publishing post creation message to ${POST_CREATE_QUEUE}`);
    return this.postClient.emit(POST_CREATE_QUEUE, message);
  }

  /**
   * Publish a comment creation message to the queue.
   * Uses emit() for fire-and-forget queue messages.
   * @param message - CommentCreateMessage payload
   */
  publishCommentCreate(message: CommentCreateMessage): Observable<any> {
    this.logger.log(`📤 Publishing comment creation message to ${COMMENT_CREATE_QUEUE}`);
    this.logger.debug(`Message payload: ${JSON.stringify(message)}`);
    // Use the queue name as the pattern for emit()
    return this.commentClient.emit(COMMENT_CREATE_QUEUE, message);
  }


}
