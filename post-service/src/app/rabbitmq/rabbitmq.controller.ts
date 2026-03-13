import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import { PostsService } from '../posts/posts.service';
import {
  PostCreateMessage,
  CommentCreatedEvent,
  CommentUpdatedEvent,
  CommentDeletedEvent,
} from '@prueba-tecnica-fullstack-angular-nest-js-mongo-db/shared-types';
import {
  POST_CREATE_QUEUE,
  COMMENT_CREATED_EVENT,
  COMMENT_UPDATED_EVENT,
  COMMENT_DELETED_EVENT,
} from './rabbitmq.constants';

/**
 * RabbitMQ Controller for consuming post creation messages and comment events.
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

  /**
   * Handle comment.created events from RabbitMQ.
   * Updates the post with the full recentComments array from the event.
   *
   * @param event - CommentCreatedEvent payload
   */
  @EventPattern(COMMENT_CREATED_EVENT)
  async handleCommentCreated(@Payload() event: CommentCreatedEvent) {
    try {
      await this.postsService.updatePostRecentComments(event.postId, event.recentComments);
      return { success: true, commentId: event.commentId };
    } catch (error) {
      console.error('Failed to process comment.created event:', (error as Error).message);
      throw error; // Let NestJS handle nack to DLQ
    }
  }

  /**
   * Handle comment.updated events from RabbitMQ.
   * Updates the post with the updated recentComments array from the event.
   *
   * @param event - CommentUpdatedEvent payload
   */
  @EventPattern(COMMENT_UPDATED_EVENT)
  async handleCommentUpdated(@Payload() event: CommentUpdatedEvent) {
    try {
      await this.postsService.updatePostRecentComments(event.postId, event.recentComments);
      return { success: true, commentId: event.commentId };
    } catch (error) {
      console.error('Failed to process comment.updated event:', (error as Error).message);
      throw error; // Let NestJS handle nack to DLQ
    }
  }

  /**
   * Handle comment.deleted events from RabbitMQ.
   * Updates the post with the updated recentComments array (after deletion).
   *
   * @param event - CommentDeletedEvent payload
   */
  @EventPattern(COMMENT_DELETED_EVENT)
  async handleCommentDeleted(@Payload() event: CommentDeletedEvent) {
    try {
      await this.postsService.updatePostRecentComments(event.postId, event.recentComments);
      return { success: true, commentId: event.commentId };
    } catch (error) {
      console.error('Failed to process comment.deleted event:', (error as Error).message);
      throw error; // Let NestJS handle nack to DLQ
    }
  }

  /**
   * Handle comment.sync events from RabbitMQ.
   * Recovery mechanism: Updates the post with recentComments array from cron sync.
   * Reuses the same logic as comment.created/updated/deleted handlers.
   *
   * @param event - Comment sync event payload (postId and recentComments)
   */
  @EventPattern('comment.sync')
  async handleCommentSync(@Payload() event: { postId: string; recentComments: any[] }) {
    try {
      await this.postsService.updatePostRecentComments(event.postId, event.recentComments);
      return { success: true, postId: event.postId };
    } catch (error) {
      console.error('Failed to process comment.sync event:', (error as Error).message);
      throw error; // Let NestJS handle nack to DLQ
    }
  }
}
