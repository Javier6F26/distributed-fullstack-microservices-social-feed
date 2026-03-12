import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeletionRequest, DeletionRequestDocument, DeletionStatus } from './schemas/deletion-request.schema';
import { RefreshTokenService } from '../refresh-token/refresh-token.service';

@Injectable()
export class DeletionService {
  private readonly logger = new Logger(DeletionService.name);
  private readonly DELETION_WINDOW_HOURS = 72;

  constructor(
    @InjectModel(DeletionRequest.name)
    private deletionRequestModel: Model<DeletionRequestDocument>,
    private refreshTokenService: RefreshTokenService,
  ) {}

  /**
   * Request account deletion with 72-hour soft delete window
   */
  async requestDeletion(
    userId: string,
    ipAddress?: string,
    reason?: string,
  ): Promise<DeletionRequest> {
    const now = new Date();
    const scheduledDeletionAt = new Date(
      now.getTime() + this.DELETION_WINDOW_HOURS * 60 * 60 * 1000,
    );

    // Create deletion request record
    const deletionRequest = await this.deletionRequestModel.create({
      userId,
      status: DeletionStatus.PENDING,
      requestedAt: now,
      scheduledDeletionAt,
      ipAddress,
      reason,
    });

    this.logger.log(
      `Deletion request created for user ${userId}. Scheduled for ${scheduledDeletionAt.toISOString()}`,
    );

    return deletionRequest;
  }

  /**
   * Revoke all tokens and mark account for deletion
   */
  async processDeletionRequest(deletionRequest: DeletionRequestDocument) {
    try {
      // Revoke all user refresh tokens
      const revokedCount = await this.refreshTokenService.revokeAllUserTokens(
        deletionRequest.userId,
      );

      this.logger.log(
        `Revoked ${revokedCount} refresh tokens for user ${deletionRequest.userId}`,
      );

      // Mark deletion request as processing
      deletionRequest.status = DeletionStatus.PROCESSING;
      await deletionRequest.save();

      return { revokedCount };
    } catch (error) {
      this.logger.error(
        `Failed to process deletion request for user ${deletionRequest.userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get pending deletion requests ready for processing
   */
  async getPendingDeletions(): Promise<DeletionRequestDocument[]> {
    const now = new Date();

    return this.deletionRequestModel
      .find({
        status: DeletionStatus.PENDING,
        scheduledDeletionAt: { $lte: now },
      })
      .exec();
  }

  /**
   * Mark deletion request as completed
   */
  async completeDeletion(deletionRequest: DeletionRequestDocument) {
    deletionRequest.status = DeletionStatus.COMPLETED;
    deletionRequest.completedAt = new Date();
    await deletionRequest.save();

    this.logger.log(
      `Deletion request completed for user ${deletionRequest.userId}`,
    );
  }

  /**
   * Cancel deletion request
   */
  async cancelDeletion(deletionRequest: DeletionRequestDocument) {
    deletionRequest.status = DeletionStatus.CANCELLED;
    await deletionRequest.save();

    this.logger.log(
      `Deletion request cancelled for user ${deletionRequest.userId}`,
    );
  }

  /**
   * Get deletion request by user ID
   */
  async getByUserId(userId: string): Promise<DeletionRequestDocument | null> {
    return this.deletionRequestModel
      .findOne({ userId, status: DeletionStatus.PENDING })
      .exec();
  }

  /**
   * Mark email as sent
   */
  async markEmailSent(deletionRequest: DeletionRequestDocument) {
    deletionRequest.emailSent = true;
    deletionRequest.emailSentAt = new Date();
    await deletionRequest.save();

    this.logger.log(
      `Deletion confirmation email marked as sent for user ${deletionRequest.userId}`,
    );
  }
}
