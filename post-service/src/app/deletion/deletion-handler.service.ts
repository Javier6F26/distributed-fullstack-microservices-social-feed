import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from '../schemas/post.schema';

@Injectable()
export class DeletionHandlerService implements OnModuleInit {
  private readonly logger = new Logger(DeletionHandlerService.name);

  constructor(
    @InjectModel(Post.name)
    private postModel: Model<PostDocument>,
  ) {}

  onModuleInit() {
    this.logger.log('Deletion handler service initialized');
  }

  /**
   * Anonymize all posts by a deleted user
   * Called when processing account deletion
   */
  async anonymizeUserPosts(userId: string): Promise<number> {
    try {
      this.logger.log(`Anonymizing posts for deleted user ${userId}`);

      const updateResult = await this.postModel.updateMany(
        { authorId: userId },
        {
          $set: {
            authorDeleted: true,
            authorDeletedAt: new Date(),
            author: 'Deleted User',
          },
        },
      );

      this.logger.log(
        `Anonymized ${updateResult.modifiedCount} posts for user ${userId}`,
      );

      return updateResult.modifiedCount;
    } catch (error: any) {
      this.logger.error(
        `Failed to anonymize posts for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get count of posts by user (for audit/logging)
   */
  async getPostCountByUser(userId: string): Promise<number> {
    return this.postModel.countDocuments({ authorId: userId }).exec();
  }

  /**
   * Get all posts by user (for export before deletion)
   */
  async getPostsByUser(userId: string): Promise<PostDocument[]> {
    return this.postModel.find({ authorId: userId }).exec();
  }
}
