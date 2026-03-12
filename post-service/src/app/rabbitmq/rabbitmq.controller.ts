import { Controller } from '@nestjs/common';
import { MessagePattern, Ctx, Payload } from '@nestjs/microservices';
import { RmqContext, RmqRecordBuilder } from '@nestjs/microservices';
import { PostsService } from '../posts/posts.service';
import { PostCreateMessage } from '@prueba-tecnica-fullstack-angular-nest-js-mongo-db/shared-types';
import { POST_CREATE_QUEUE, DEAD_LETTER_EXCHANGE } from './rabbitmq.constants';

/**
 * RabbitMQ Controller for consuming post creation messages.
 * Uses proper NestJS microservices pattern with message acknowledgment.
 */
@Controller()
export class RabbitmqController {
  constructor(private readonly postsService: PostsService) {}

  /**
   * Handle post creation messages from RabbitMQ queue.
   * Acknowledges message on success, rejects to DLQ on failure.
   * 
   * @param data - Post creation message payload
   * @param context - RMQ context for manual acknowledgment
   */
  @MessagePattern(POST_CREATE_QUEUE)
  async handlePostCreate(
    @Payload() data: PostCreateMessage,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();

    try {
      // Validate message payload
      if (!data.userId || !data.title || !data.body) {
        throw new Error('Invalid message payload: missing required fields');
      }

      // Create post in database
      await this.postsService.createPostFromQueue(data);

      // Acknowledge successful processing
      channel.ack(originalMessage);
      
      // Emit post.created event for other services
      channel.sendToQueue('post.events', new RmqRecordBuilder({
        event: 'post.created',
        data: {
          postId: data.tempId, // Will be replaced with actual _id after save
          userId: data.userId,
          tempId: data.tempId,
        },
      }).build());

      return { success: true, tempId: data.tempId };
    } catch (error) {
      // Log error
      console.error('Failed to process post creation:', error.message);

      // Reject message and send to DLQ (don't retry)
      channel.nack(originalMessage, false, false);

      return { success: false, error: error.message };
    }
  }
}
