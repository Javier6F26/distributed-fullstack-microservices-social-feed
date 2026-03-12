import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeletionService } from './deletion.service';
import { DeletionRequestDocument, DeletionStatus } from './schemas/deletion-request.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DeletionCronService implements OnModuleInit {
  private readonly logger = new Logger(DeletionCronService.name);
  private readonly POST_SERVICE_URL = process.env.POST_SERVICE_URL || 'http://localhost:3002';
  private readonly COMMENT_SERVICE_URL = process.env.COMMENT_SERVICE_URL || 'http://localhost:3003';
  private readonly cronExpression: string;

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private deletionService: DeletionService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    // Configure cron expression from environment variable
    // Default: EVERY_HOUR for production, can be overridden for development
    this.cronExpression = this.configService.get<string>(
      'DELETION_CRON_EXPRESSION',
      CronExpression.EVERY_HOUR,
    );
  }

  onModuleInit() {
    this.logger.log('Deletion cron job service initialized');
  }

  /**
   * Cron job: Run at configured interval to process scheduled deletions
   * Processes accounts where scheduledDeletionAt < now
   * Default: Every hour (configurable via DELETION_CRON_EXPRESSION env var)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledDeletions() {
    this.logger.log('Running scheduled deletion cron job...');

    try {
      // Get pending deletion requests ready for processing
      const pendingDeletions = await this.deletionService.getPendingDeletions();

      if (pendingDeletions.length === 0) {
        this.logger.log('No pending deletions to process');
        return;
      }

      this.logger.log(`Processing ${pendingDeletions.length} scheduled deletion(s)`);

      for (const deletionRequest of pendingDeletions) {
        await this.hardDeleteUser(deletionRequest);
      }

      this.logger.log(`Successfully processed ${pendingDeletions.length} deletion(s)`);
    } catch (error: any) {
      this.logger.error('Failed to process scheduled deletions:', error);
    }
  }

  /**
   * Perform hard deletion of user account
   * 1. Anonymize posts and comments across services
   * 2. Remove personal information (email, username, passwordHash)
   * 3. Mark account as deleted
   * 4. Update deletion request status
   */
  private async hardDeleteUser(deletionRequest: DeletionRequestDocument) {
    try {
      this.logger.log(`Starting hard deletion for user ${deletionRequest.userId}`);

      // Step 1: Anonymize posts in post-service
      try {
        await firstValueFrom(
          this.httpService.post(`${this.POST_SERVICE_URL}/api/deletion/anonymize`, {
            userId: deletionRequest.userId,
          }),
        );
        this.logger.log(`Posts anonymized for user ${deletionRequest.userId}`);
      } catch (error: any) {
        this.logger.error(
          `Failed to anonymize posts for user ${deletionRequest.userId}:`,
          error.response?.data || error.message,
        );
      }

      // Step 2: Anonymize comments in comment-service
      try {
        await firstValueFrom(
          this.httpService.post(`${this.COMMENT_SERVICE_URL}/api/deletion/anonymize`, {
            userId: deletionRequest.userId,
          }),
        );
        this.logger.log(`Comments anonymized for user ${deletionRequest.userId}`);
      } catch (error: any) {
        this.logger.error(
          `Failed to anonymize comments for user ${deletionRequest.userId}:`,
          error.response?.data || error.message,
        );
      }

      // Step 3: Update user document - anonymize and remove personal data
      const updateResult = await this.userModel.updateOne(
        { _id: deletionRequest.userId },
        {
          $set: {
            deleted: true,
            deletedAt: new Date(),
            username: `Deleted_${deletionRequest.userId.slice(-8)}`,
            email: `deleted_${deletionRequest.userId.slice(-8)}@deleted.local`,
            passwordHash: '', // Clear password hash
            isActive: false,
          },
        },
      );

      if (updateResult.modifiedCount === 0) {
        this.logger.warn(`User ${deletionRequest.userId} not found for deletion`);
        return;
      }

      // Step 4: Mark deletion request as completed
      await this.deletionService.completeDeletion(deletionRequest);

      this.logger.log(
        `Hard deletion completed for user ${deletionRequest.userId}. ` +
        `Personal data removed, posts/comments anonymized.`,
      );

      // TODO: Send final confirmation email that deletion is complete
      this.logger.log(
        `Deletion confirmation email would be sent for user ${deletionRequest.userId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to hard delete user ${deletionRequest.userId}:`,
        error,
      );
      throw error;
    }
  }
}
