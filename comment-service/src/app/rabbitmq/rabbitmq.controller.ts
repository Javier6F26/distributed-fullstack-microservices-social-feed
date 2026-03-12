import { Controller } from '@nestjs/common';
import { MessagePattern, Ctx, Payload } from '@nestjs/microservices';
import { RmqContext, RmqRecordBuilder } from '@nestjs/microservices';
import { CommentsService } from '../comments/comments.service';
import { CommentCreateMessage } from '@prueba-tecnica-fullstack-angular-nest-js-mongo-db/shared-types';
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
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();

    try {
      // Validate message payload
      if (!data.postId || !data.userId || !data.body) {
        throw new Error('Invalid message payload: missing required fields');
      }

      // Create comment in database
      await this.commentsService.createCommentFromQueue(data);

      // Acknowledge successful processing
      channel.ack(originalMessage);

      // Emit comment.created event for other services
      channel.sendToQueue('comment.events', new RmqRecordBuilder({
        event: 'comment.created',
        data: {
          commentId: data.tempId, // Will be replaced with actual _id after save
          postId: data.postId,
          userId: data.userId,
          tempId: data.tempId,
        },
      }).build());

      return { success: true, tempId: data.tempId };
    } catch (error) {
      // Log error
      console.error('Failed to process comment creation:', error.message);

      // Reject message and send to DLQ (don't retry)
      channel.nack(originalMessage, false, false);

      return { success: false, error: error.message };
    }
  }
}
