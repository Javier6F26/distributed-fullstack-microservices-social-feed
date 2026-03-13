import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule } from '@nestjs/config';
import { RabbitmqService } from './rabbitmq.service';
import { RabbitmqEventsController } from './rabbitmq-events.controller';
import {
  POST_CREATE_QUEUE,
  COMMENT_CREATE_QUEUE,
  RABBITMQ_URI_KEY,
  RABBITMQ_DEFAULT_URI,
  POST_CREATE_QUEUE_OPTIONS,
  COMMENT_CREATE_QUEUE_OPTIONS,
} from './rabbitmq.constants';

/**
 * Global RabbitMQ module for API Gateway.
 * Provides RabbitMQ service for producing messages to queues.
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    ClientsModule.register([
      {
        name: 'RABBITMQ_POST',
        transport: Transport.RMQ,
        options: {
          urls: [process.env[RABBITMQ_URI_KEY] || RABBITMQ_DEFAULT_URI],
          queue: POST_CREATE_QUEUE,
          queueOptions: POST_CREATE_QUEUE_OPTIONS,
        },
      },
      {
        name: 'RABBITMQ_COMMENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env[RABBITMQ_URI_KEY] || RABBITMQ_DEFAULT_URI],
          queue: COMMENT_CREATE_QUEUE,
          queueOptions: COMMENT_CREATE_QUEUE_OPTIONS,
        },
      },
    ]),
  ],
  providers: [RabbitmqService],
  controllers: [RabbitmqEventsController],
  exports: [RabbitmqService],
})
export class RabbitmqModule {}
