import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import {
  POST_CREATE_QUEUE,
  RABBITMQ_URI_KEY,
  RABBITMQ_DEFAULT_URI,
  POST_CREATE_QUEUE_OPTIONS,
} from './rabbitmq.constants';
import { Post, PostDocument } from '../schemas/post.schema';

/**
 * RabbitMQ service for producing messages in Post Service.
 * Handles connection to RabbitMQ for event publishing.
 */
@Injectable()
export class RabbitmqService implements OnModuleInit {
  private readonly logger = new Logger(RabbitmqService.name);
  private client: ClientProxy;

  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private readonly configService: ConfigService,
  ) {}

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
   * Check if RabbitMQ client is connected.
   */
  isConnected(): boolean {
    return this.client !== undefined;
  }
}
