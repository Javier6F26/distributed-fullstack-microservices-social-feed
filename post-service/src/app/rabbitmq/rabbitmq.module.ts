import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitmqService } from './rabbitmq.service';
import { RabbitmqController } from './rabbitmq.controller';
import { PostsModule } from '../posts/posts.module';

/**
 * Global RabbitMQ module for Post Service.
 * Provides RabbitMQ service for consuming messages from queues.
 * Queue connections are configured in main.ts via connectMicroservice().
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    PostsModule,
  ],
  providers: [RabbitmqService],
  controllers: [RabbitmqController],
  exports: [RabbitmqService],
})
export class RabbitmqModule {}
