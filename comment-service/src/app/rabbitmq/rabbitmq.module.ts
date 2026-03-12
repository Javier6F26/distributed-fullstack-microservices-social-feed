import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { RabbitmqService } from './rabbitmq.service';
import { RabbitmqController } from './rabbitmq.controller';
import { CommentsModule } from '../comments/comments.module';
import {
  COMMENT_CREATE_QUEUE,
  RABBITMQ_URI_KEY,
  RABBITMQ_DEFAULT_URI,
  DEAD_LETTER_EXCHANGE,
} from './rabbitmq.constants';
import { Comment, CommentSchema } from '../schemas/comment.schema';

/**
 * Global RabbitMQ module for Comment Service.
 * Provides RabbitMQ service for consuming messages from queues.
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    CommentsModule,
    MongooseModule.forFeature([{ name: Comment.name, schema: CommentSchema }]),
    ClientsModule.register([
      {
        name: 'RABBITMQ_COMMENT_CREATE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env[RABBITMQ_URI_KEY] || RABBITMQ_DEFAULT_URI],
          queue: COMMENT_CREATE_QUEUE,
          queueOptions: {
            durable: true,
            deadLetterExchange: DEAD_LETTER_EXCHANGE,
            messageTtl: 86400000, // 24 hours TTL
          },
        },
      },
      {
        name: 'RABBITMQ_EVENTS',
        transport: Transport.RMQ,
        options: {
          urls: [process.env[RABBITMQ_URI_KEY] || RABBITMQ_DEFAULT_URI],
          queue: 'comment.events',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  providers: [RabbitmqService],
  controllers: [RabbitmqController],
  exports: [RabbitmqService],
})
export class RabbitmqModule {}
