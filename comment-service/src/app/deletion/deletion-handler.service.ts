import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from '../schemas/comment.schema';

@Injectable()
export class DeletionHandlerService implements OnModuleInit {
  private readonly logger = new Logger(DeletionHandlerService.name);

  constructor(
    @InjectModel(Comment.name)
    private commentModel: Model<CommentDocument>,
  ) {}

  onModuleInit() {
    this.logger.log('Deletion handler service initialized');
  }

  /**
   * Anonymize all comments by a deleted user
   * Called when processing account deletion
   */
  async anonymizeUserComments(userId: string): Promise<number> {
    try {
      this.logger.log(`Anonymizing comments for deleted user ${userId}`);

      const updateResult = await this.commentModel.updateMany(
        { authorId: userId },
        {
          $set: {
            authorDeleted: true,
            authorDeletedAt: new Date(),
            author: 'Deleted User',
            anonymizedAuthor: 'Deleted User',
          },
        },
      );

      this.logger.log(
        `Anonymized ${updateResult.modifiedCount} comments for user ${userId}`,
      );

      return updateResult.modifiedCount;
    } catch (error: any) {
      this.logger.error(
        `Failed to anonymize comments for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get count of comments by user (for audit/logging)
   */
  async getCommentCountByUser(userId: string): Promise<number> {
    return this.commentModel.countDocuments({ authorId: userId }).exec();
  }

  /**
   * Get all comments by user (for export before deletion)
   */
  async getCommentsByUser(userId: string): Promise<CommentDocument[]> {
    return this.commentModel.find({ authorId: userId }).exec();
  }
}
