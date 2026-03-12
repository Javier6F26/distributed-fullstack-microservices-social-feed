import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PostsService } from '../posts/posts.service';
import { PostCreateMessage } from '@prueba-tecnica-fullstack-angular-nest-js-mongo-db/shared-types';
import { POST_CREATE_QUEUE } from './rabbitmq.constants';

/**
 * RabbitMQ Controller for consuming post creation messages.
 */
@Controller()
export class RabbitmqController {
  constructor(private readonly postsService: PostsService) {}

  /**
   * Handle post creation messages from RabbitMQ queue.
   * NestJS handles acknowledgment automatically.
   *
   * @param data - Post creation message payload
   */
  @MessagePattern(POST_CREATE_QUEUE)
  async handlePostCreate(@Payload() data: any) {
    try {
      // NestJS may wrap the payload, extract the actual message
      const message: PostCreateMessage = data?.pattern ? data.data : data;

      // Validate message payload
      if (!message.userId || !message.title || !message.body) {
        throw new Error('Invalid message payload: missing required fields');
      }

      // Create post in database
      await this.postsService.createPostFromQueue(message);

      return { success: true, tempId: message.tempId };
    } catch (error) {
      // Log error
      console.error('Failed to process post creation:', (error as Error).message);
      throw error; // Let NestJS handle the error
    }
  }
}
