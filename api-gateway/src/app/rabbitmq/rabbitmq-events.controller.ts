import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { Cache } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';

/**
 * RabbitMQ Events Controller for API Gateway.
 * Listens for post.created, post.create.failed, comment.created, comment.create.failed events
 * and updates the Redis cache for pending write tracking.
 */
@Controller()
export class RabbitmqEventsController {
  private readonly logger = new Logger(RabbitmqEventsController.name);

  constructor(@Inject('CACHE_MANAGER') private cacheManager: Cache) {}

  /**
   * Handle post.created event - confirm pending write and store real postId
   */
  @EventPattern('post.created')
  async handlePostCreated(@Payload() payload: { tempId?: string; postId?: string }) {
    if (!payload.tempId) {
      this.logger.warn('post.created event received without tempId');
      return;
    }

    try {
      // Store the real postId for the frontend to retrieve
      if (payload.postId) {
        await this.cacheManager.set(`post:tempId:${payload.tempId}`, payload.postId, 60000);
        this.logger.log(`✅ Stored postId ${payload.postId} for tempId: ${payload.tempId}`);
      } else {
        this.logger.warn('post.created event received without postId');
      }

      await this.cacheManager.del(`pending:${payload.tempId}`);
      await this.cacheManager.del(`pending:error:${payload.tempId}`);
      this.logger.log(`✅ Confirmed post write for tempId: ${payload.tempId}`);
    } catch (error: any) {
      this.logger.error(`Failed to confirm post write for tempId ${payload.tempId}:`, error.message);
    }
  }

  /**
   * Handle post.create.failed event - mark as error
   */
  @EventPattern('post.create.failed')
  async handlePostCreateFailed(@Payload() payload: { tempId: string; error: string }) {
    try {
      await this.cacheManager.set(`pending:${payload.tempId}`, 'error', 30000);
      await this.cacheManager.set(`pending:error:${payload.tempId}`, payload.error, 30000);
      this.logger.log(`❌ Marked post write as error for tempId: ${payload.tempId}`);
    } catch (error: any) {
      this.logger.error(`Failed to mark post write as error for tempId ${payload.tempId}:`, error.message);
    }
  }

  /**
   * Handle comment.created event - confirm pending write
   */
  @EventPattern('comment.created')
  async handleCommentCreated(@Payload() payload: { tempId?: string }) {
    if (!payload.tempId) {
      this.logger.warn('comment.created event received without tempId');
      return;
    }

    try {
      await this.cacheManager.del(`pending:${payload.tempId}`);
      await this.cacheManager.del(`pending:error:${payload.tempId}`);
      this.logger.log(`✅ Confirmed comment write for tempId: ${payload.tempId}`);
    } catch (error: any) {
      this.logger.error(`Failed to confirm comment write for tempId ${payload.tempId}:`, error.message);
    }
  }

  /**
   * Handle comment.create.failed event - mark as error
   */
  @EventPattern('comment.create.failed')
  async handleCommentCreateFailed(@Payload() payload: { tempId: string; error: string }) {
    try {
      await this.cacheManager.set(`pending:${payload.tempId}`, 'error', 30000);
      await this.cacheManager.set(`pending:error:${payload.tempId}`, payload.error, 30000);
      this.logger.log(`❌ Marked comment write as error for tempId: ${payload.tempId}`);
    } catch (error: any) {
      this.logger.error(`Failed to mark comment write as error for tempId ${payload.tempId}:`, error.message);
    }
  }
}
