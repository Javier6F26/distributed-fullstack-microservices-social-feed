import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import {
  RABBITMQ_URI_KEY,
  RABBITMQ_DEFAULT_URI,
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
}
