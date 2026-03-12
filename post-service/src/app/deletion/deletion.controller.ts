import { Controller, Post, Body, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { DeletionHandlerService } from './deletion-handler.service';

@Controller('deletion')
export class DeletionController {
  private readonly logger = new Logger(DeletionController.name);

  constructor(private deletionHandler: DeletionHandlerService) {}

  /**
   * POST /deletion/anonymize
   * Anonymize all content by a deleted user
   * Called by user-service during hard deletion process
   */
  @Post('anonymize')
  @HttpCode(HttpStatus.OK)
  async anonymizeUserContent(@Body() body: { userId: string }) {
    try {
      const { userId } = body;

      if (!userId) {
        return {
          success: false,
          message: 'userId is required',
        };
      }

      // Get post count for logging
      const postCount = await this.deletionHandler.getPostCountByUser(userId);

      // Anonymize all posts by this user
      const anonymizedCount = await this.deletionHandler.anonymizeUserPosts(userId);

      this.logger.log(
        `Anonymized ${anonymizedCount}/${postCount} posts for user ${userId}`,
      );

      return {
        success: true,
        message: `Anonymized ${anonymizedCount} posts`,
        postCount,
        anonymizedCount,
      };
    } catch (error: any) {
      this.logger.error('Failed to anonymize user content:', error);
      return {
        success: false,
        message: 'Failed to anonymize posts',
        error: error.message,
      };
    }
  }
}
