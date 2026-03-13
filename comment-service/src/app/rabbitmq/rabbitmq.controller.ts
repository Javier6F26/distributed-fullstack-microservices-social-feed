import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CommentsService } from '../comments/comments.service';
import { CommentCreateMessage } from '@app/shared-types';
import { COMMENT_CREATE_QUEUE } from './rabbitmq.constants';

/**
 * RabbitMQ Controller for consuming comment creation messages.
 * Uses proper NestJS microservices pattern with message acknowledgment.
 */
@Controller()
export class RabbitmqController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * Handle comment creation messages from RabbitMQ queue.
   * Acknowledges message on success, rejects to DLQ on failure.
   *
   * @param data - Comment creation message payload
   * @param context - RMQ context for manual acknowledgment
   */
  @MessagePattern(COMMENT_CREATE_QUEUE)
  async handleCommentCreate(
    @Payload() data: CommentCreateMessage,
  ) {
    try {
      // Validate message payload
      if (!data.postId || !data.authorId || !data.name || !data.email || !data.body) {
        throw new Error('Invalid message payload: missing required fields');
      }

      // Create comment in database
      await this.commentsService.createCommentFromQueue(data);

      return { success: true, tempId: data.tempId };
    } catch (error) {
      // Log error
      console.error('Failed to process comment creation:', (error as Error).message);

      // NestJS will automatically nack the message on error
      throw error;
    }
  }
}
