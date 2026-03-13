import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PostSyncTracker, PostSyncTrackerDocument } from '../schemas/post-sync-tracker.schema';
import { Comment } from '../schemas/comment.schema';
import { PostComment } from '@app/shared-types';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class CommentsSyncService implements OnModuleInit {
  private readonly logger = new Logger(CommentsSyncService.name);
  private readonly startupDelayMs: number;

  constructor(
    @InjectModel(PostSyncTracker.name) private syncTrackerModel: Model<PostSyncTrackerDocument>,
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    private readonly rabbitmqService: RabbitmqService,
    private readonly configService: ConfigService,
  ) {
    this.startupDelayMs = this.configService.get<number>('COMMENTS_SYNC_STARTUP_DELAY_MS') || 30000;
  }

  onModuleInit() {
    this.logger.log('Comments sync service initialized');
    this.logger.log(`Startup sync will run in ${this.startupDelayMs / 1000} seconds`);

    // Schedule startup sync with delay to wait for dependencies
    setTimeout(() => {
      this.logger.log('Running startup sync...');
      this.syncComments().catch((err) => {
        this.logger.error('Startup sync failed:', err);
      });
    }, this.startupDelayMs);
  }

  /**
   * Cron job: Run every hour to sync recent comments to posts
   * Only processes posts that have new comments since last sync
   */
  @Cron(CronExpression.EVERY_HOUR)
  async syncComments() {
    const startTime = Date.now();
    this.logger.log('Starting hourly comments sync...');

    try {
      // Find all posts that need syncing (have comments newer than lastCommentsSyncAt)
      const postsToUpdate = await this.findPostsNeedingSync();

      if (postsToUpdate.length === 0) {
        this.logger.log('No posts need syncing');
        return;
      }

      this.logger.log(`Found ${postsToUpdate.length} posts to update`);

      // Process in batches of 100
      const batchSize = 100;
      let updatedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < postsToUpdate.length; i += batchSize) {
        const batch = postsToUpdate.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map((post) => this.publishSyncEventForPost(post.postId, post.lastCommentsSyncAt)),
        );

        updatedCount += results.filter((r) => r.status === 'fulfilled').length;
        errorCount += results.filter((r) => r.status === 'rejected').length;
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Comments sync complete: ${updatedCount} posts updated, ${errorCount} errors (${duration}ms)`,
      );
    } catch (error: any) {
      this.logger.error(`Comments sync failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find posts that have comments newer than their lastCommentsSyncAt
   * Uses aggregation to efficiently find posts needing sync
   */
  private async findPostsNeedingSync(): Promise<Array<{ postId: Types.ObjectId; lastCommentsSyncAt?: Date }>> {
    // Get all sync trackers
    const trackers = await this.syncTrackerModel.find().select('postId lastCommentsSyncAt').lean().exec();
    const trackerMap = new Map<string, Date>();
    trackers.forEach((t) => {
      trackerMap.set(t.postId.toString(), t.lastCommentsSyncAt || new Date(0));
    });

    this.logger.log(`Found ${trackers.length} sync trackers`);

    // Use aggregation to find posts with comments newer than their last sync
    const pipeline = [
      {
        $group: {
          _id: '$postId',
          latestCommentAt: { $max: '$createdAt' },
          latestUpdateAt: { $max: { $ifNull: ['$updatedAt', '$createdAt'] } },
        },
      },
      {
        $addFields: {
          latestActivity: { $max: ['$latestCommentAt', '$latestUpdateAt'] },
        },
      },
    ];

    const postAggregations: Array<{ _id: Types.ObjectId; latestActivity: Date }> =
      await this.commentModel.aggregate(pipeline).exec();

    this.logger.log(`Found ${postAggregations.length} posts with comments in database`);

    const postsNeedingSync: Array<{ postId: Types.ObjectId; lastCommentsSyncAt?: Date }> = [];
    let alreadySyncedCount = 0;

    for (const agg of postAggregations) {
      const postIdStr = agg._id.toString();
      const lastSync = trackerMap.get(postIdStr);

      // If never synced (no tracker) OR has comments newer than last sync
      if (lastSync === undefined) {
        postsNeedingSync.push({
          postId: agg._id,
          lastCommentsSyncAt: lastSync,
        });
      } else if (agg.latestActivity && agg.latestActivity > lastSync) {
        postsNeedingSync.push({
          postId: agg._id,
          lastCommentsSyncAt: lastSync,
        });
      } else {
        alreadySyncedCount++;
        if (alreadySyncedCount <= 3) {
          this.logger.debug(`Post ${postIdStr}: latestActivity=${agg.latestActivity?.toISOString()}, lastSync=${lastSync.toISOString()} - already synced`);
        }
      }
    }

    this.logger.log(`Found ${postsNeedingSync.length} posts needing sync out of ${postAggregations.length} posts with comments (${alreadySyncedCount} already synced)`);
    return postsNeedingSync;
  }

  /**
   * Force sync all posts regardless of tracker state
   * Useful for recovery when trackers are out of sync with actual post state
   */
  async forceSyncAllPosts() {
    const startTime = Date.now();
    this.logger.log('Starting FORCE sync for ALL posts...');

    try {
      // Get all posts with comments (ignore trackers)
      const pipeline = [
        {
          $group: {
            _id: '$postId',
            latestCommentAt: { $max: '$createdAt' },
            latestUpdateAt: { $max: { $ifNull: ['$updatedAt', '$createdAt'] } },
          },
        },
        {
          $addFields: {
            latestActivity: { $max: ['$latestCommentAt', '$latestUpdateAt'] },
          },
        },
      ];

      const postAggregations: Array<{ _id: Types.ObjectId; latestActivity: Date }> =
        await this.commentModel.aggregate(pipeline).exec();

      this.logger.log(`Found ${postAggregations.length} posts to force sync`);

      // Process in batches of 100
      const batchSize = 100;
      let updatedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < postAggregations.length; i += batchSize) {
        const batch = postAggregations.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map((agg) => this.publishSyncEventForPost(agg._id, undefined)),
        );

        updatedCount += results.filter((r) => r.status === 'fulfilled').length;
        errorCount += results.filter((r) => r.status === 'rejected').length;
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Force sync complete: ${updatedCount} posts updated, ${errorCount} errors (${duration}ms)`,
      );
    } catch (error: any) {
      this.logger.error(`Force sync failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Publish comment.sync event for a single post
   * Fetches top 10 recent comments and publishes via RabbitMQ
   */
  private async publishSyncEventForPost(postId: Types.ObjectId, lastSyncAt?: Date): Promise<void> {
    try {
      // Fetch top 10 recent comments
      const recentComments = await this.fetchRecentComments(postId.toString(), 10);

      // Publish event via RabbitMQ (reuse existing comment.created pattern)
      // Using 'comment.sync' event type to distinguish from real-time events
      await this.rabbitmqService.emitCommentSync(postId.toString(), recentComments);

      // Update or create sync tracker
      await this.syncTrackerModel
        .findOneAndUpdate(
          { postId },
          {
            postId,
            lastCommentsSyncAt: new Date(),
          },
          { upsert: true, returnDocument: 'after' },
        )
        .exec();

      this.logger.debug(`Published sync event for post ${postId}`);
    } catch (error: any) {
      this.logger.error(`Failed to sync post ${postId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch top N recent comments for a post
   * Returns comments in newest-first order
   */
  private async fetchRecentComments(postId: string, limit: number): Promise<PostComment[]> {
    const comments = await this.commentModel
      .find({ postId: new Types.ObjectId(postId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    return comments.map((comment: any) => ({
      _id: comment._id.toString(),
      postId: comment.postId.toString(),
      authorId: comment.authorId,
      name: comment.name,
      email: comment.email,
      body: comment.body,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    }));
  }
}
