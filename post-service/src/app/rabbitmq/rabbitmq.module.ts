import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { RabbitmqService } from './rabbitmq.service';
import { RabbitmqController } from './rabbitmq.controller';
import {
  POST_CREATE_QUEUE,
  RABBITMQ_URI_KEY,
  RABBITMQ_DEFAULT_URI,
} from './rabbitmq.constants';
import { Post, PostSchema } from '../schemas/post.schema';
import { PostsService } from '../posts/posts.service';

/**
 * Global RabbitMQ module for Post Service.
 * Provides RabbitMQ service for consuming messages from queues.
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }]),
    ClientsModule.register([
      {
        name: 'RABBITMQ_EVENTS',
        transport: Transport.RMQ,
        options: {
          urls: [process.env[RABBITMQ_URI_KEY] || RABBITMQ_DEFAULT_URI],
          queue: 'post.events',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  providers: [RabbitmqService, PostsService],
  controllers: [RabbitmqController],
  exports: [RabbitmqService],
})
export class RabbitmqModule {}
