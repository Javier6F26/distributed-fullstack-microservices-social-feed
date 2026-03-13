import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from '../schemas/post.schema';
import { SearchPostsDto } from './dto/search-posts.dto';
import { FilterPostsDto } from './dto/filter-posts.dto';
import { PostCreateMessage, PostComment } from '@prueba-tecnica-fullstack-angular-nest-js-mongo-db/shared-types';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private readonly rabbitmqService: RabbitmqService,
  ) {}

  /**
   * Validate if a string is a valid MongoDB ObjectId
   */
  private isValidObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id);
  }

  /**
   * Create post from RabbitMQ queue message.
   * Called by RabbitmqController when consuming messages.
   *
   * @param message - PostCreateMessage from queue
   * @returns Created post document
   * 
   * NOTE: tempId is NEVER stored in the database. It is only used for:
   * - Optimistic UI correlation on the frontend
   * - RabbitMQ event payload for API Gateway pending write confirmation
   * - Redis cache key (30 second TTL) for polling-based confirmation
   */
  async createPostFromQueue(message: PostCreateMessage): Promise<PostDocument> {
    const post = new this.postModel({
      authorId: message.userId,
      author: message.author,
      title: message.title,
      body: message.body,
      createdAt: message.createdAt || new Date(),
      commentCount: 0,
      deleted: false,
      recentComments: [],
    });

    try {
      const savedPost = await post.save();
      this.logger.log(`✅ Created post ${savedPost._id}`);

      // Emit post.created event with tempId for API Gateway to confirm
      await this.rabbitmqService.emitPostCreated({
        postId: savedPost._id.toString(),
        userId: message.userId,
        tempId: message.tempId,
      });

      return savedPost;
    } catch (error: any) {
      this.logger.error(`❌ Failed to create post: ${error.message}`);

      // Emit post.create.failed event with tempId for API Gateway to mark as error
      if (message.tempId) {
        await this.rabbitmqService.emitPostCreateFailed({
          tempId: message.tempId,
          error: error.message || 'Failed to save post',
        });
      }

      throw error;
    }
  }

  /**
   * Update post with recentComments array from comment event.
   * Called by RabbitmqController when consuming comment.created, comment.updated, or comment.deleted events.
   * Simply stores the pre-computed recentComments array from the event payload.
   *
   * @param postId - The post ID to update
   * @param recentComments - Array of recent comments (pre-computed by Comment Service)
   */
  async updatePostRecentComments(postId: string, recentComments: PostComment[]): Promise<void> {
    // Validate postId
    if (!this.isValidObjectId(postId)) {
      throw new BadRequestException(`Invalid postId: ${postId}`);
    }

    // Update post with the recentComments array from event
    // Note: We do NOT filter by deleted: false here to allow comment updates on soft-deleted posts
    // This ensures data consistency even if the post is soft-deleted (it won't appear in feed anyway)
    // IMPORTANT: timestamps: false prevents updatedAt from being modified by system interactions
    const result = await this.postModel
      .findOneAndUpdate(
        { _id: postId },
        { $set: { recentComments } },
        { returnDocument: 'after', timestamps: false },
      )
      .exec();

    if (!result) {
      this.logger.warn(`Post not found: ${postId}. Skipping recentComments update.`);
      return;
    }

    this.logger.log(`✅ Updated post ${postId} with ${recentComments.length} recent comments`);
  }

  /**
   * Update post by ID (edit functionality).
   * Only updates fields provided in updates object.
   * Automatically sets updatedAt timestamp.
   *
   * @param postId - The post ID to update
   * @param updates - The updates to apply (title and/or body)
   * @returns Updated post document
   */
  async updatePost(postId: string, updates: { title?: string; body?: string }): Promise<PostDocument> {
    // Validate postId
    if (!this.isValidObjectId(postId)) {
      throw new BadRequestException(`Invalid postId: ${postId}`);
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (updates.title !== undefined) {
      updateData.title = updates.title;
    }
    if (updates.body !== undefined) {
      updateData.body = updates.body;
    }

    // Update post, Mongoose timestamps will auto-update updatedAt
    const updatedPost = await this.postModel
      .findOneAndUpdate(
        { _id: postId, deleted: false },
        { $set: updateData },
        { returnDocument: 'after' },
      )
      .exec();

    if (!updatedPost) {
      throw new NotFoundException(`Post ${postId} not found or deleted`);
    }

    // Emit post.updated event
    await this.rabbitmqService.emitPostUpdated(postId, updatedPost);

    this.logger.log(`✅ Updated post ${postId}`);
    return updatedPost;
  }

  /**
   * Delete post by ID (soft delete).
   * Sets deleted: true and deletedAt timestamp.
   *
   * @param postId - The post ID to delete
   * @returns Deleted post document
   */
  async deletePost(postId: string): Promise<PostDocument> {
    // Validate postId
    if (!this.isValidObjectId(postId)) {
      throw new BadRequestException(`Invalid postId: ${postId}`);
    }

    // Soft delete - set deleted flag and timestamp
    const deletedPost = await this.postModel
      .findOneAndUpdate(
        { _id: postId, deleted: false },
        { $set: { deleted: true, deletedAt: new Date() } },
        { returnDocument: 'after' },
      )
      .exec();

    if (!deletedPost) {
      throw new NotFoundException(`Post ${postId} not found or already deleted`);
    }

    // Emit post.deleted event
    await this.rabbitmqService.emitPostDeleted(postId);

    this.logger.log(`✅ Deleted post ${postId}`);
    return deletedPost;
  }

  /**
   * Find a single post by ID.
   *
   * @param postId - The post ID to find
   * @returns Post document or null if not found/deleted
   */
  async findOne(postId: string): Promise<PostDocument | null> {
    if (!this.isValidObjectId(postId)) {
      throw new BadRequestException(`Invalid postId: ${postId}`);
    }

    return await this.postModel
      .findOne({ _id: postId, deleted: false })
      .exec();
  }

  async findAll(limit = 20, cursor?: string): Promise<{ posts: Post[]; nextCursor: string | null }> {
    const query: any = { deleted: false };

    // Validate cursor if provided
    if (cursor) {
      if (!this.isValidObjectId(cursor)) {
        throw new BadRequestException(`Invalid cursor format: must be a 24-character hex string`);
      }
      query._id = { $lt: cursor };
    }

    const posts = await this.postModel
      .find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .exec();

    let nextCursor = null;
    if (posts.length === limit) {
      nextCursor = (posts[posts.length - 1] as any)._id.toString();
    }

    return { posts, nextCursor };
  }

  async search(searchDto: SearchPostsDto, limit = 20, cursor?: string): Promise<{ posts: Post[]; nextCursor: string | null }> {
    const query: any = { deleted: false };

    // Validate cursor if provided
    if (cursor) {
      if (!this.isValidObjectId(cursor)) {
        throw new BadRequestException(`Invalid cursor format: must be a 24-character hex string`);
      }
      query._id = { $lt: cursor };
    }

    // Add search query if provided
    if (searchDto.q && searchDto.q.trim()) {
      const searchTerm = searchDto.q.trim();
      // Case-insensitive regex search on title and body
      query.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { body: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    const posts = await this.postModel
      .find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .exec();

    let nextCursor = null;
    if (posts.length === limit) {
      nextCursor = (posts[posts.length - 1] as any)._id.toString();
    }

    return { posts, nextCursor };
  }

  async filter(filterDto: FilterPostsDto, limit = 20, cursor?: string): Promise<{ posts: Post[]; nextCursor: string | null }> {
    const query: any = { deleted: false };

    // Validate cursor if provided
    if (cursor) {
      if (!this.isValidObjectId(cursor)) {
        throw new BadRequestException(`Invalid cursor format: must be a 24-character hex string`);
      }
      query._id = { $lt: cursor };
    }

    // Add date range filters if provided
    if (filterDto.startDate || filterDto.endDate) {
      query.createdAt = {};
      if (filterDto.startDate) {
        const start = new Date(filterDto.startDate);
        if (!isNaN(start.getTime())) {
          query.createdAt.$gte = start;
        }
      }
      if (filterDto.endDate) {
        const end = new Date(filterDto.endDate);
        if (!isNaN(end.getTime())) {
          // Include the entire end date by setting to end of day
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }
    }

    const posts = await this.postModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    let nextCursor = null;
    if (posts.length === limit) {
      nextCursor = (posts[posts.length - 1] as any)._id.toString();
    }

    return { posts, nextCursor };
  }

  async searchAndFilter(
    searchDto: SearchPostsDto,
    filterDto: FilterPostsDto,
    limit = 20,
    cursor?: string,
  ): Promise<{ posts: Post[]; nextCursor: string | null }> {
    const query: any = { deleted: false };

    // Validate cursor if provided
    if (cursor) {
      if (!this.isValidObjectId(cursor)) {
        throw new BadRequestException(`Invalid cursor format: must be a 24-character hex string`);
      }
      query._id = { $lt: cursor };
    }

    // Add search query if provided
    if (searchDto.q && searchDto.q.trim()) {
      const searchTerm = searchDto.q.trim();
      query.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { content: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    // Add date range filters if provided
    if (filterDto.startDate || filterDto.endDate) {
      query.createdAt = {};
      if (filterDto.startDate) {
        const start = new Date(filterDto.startDate);
        if (!isNaN(start.getTime())) {
          query.createdAt.$gte = start;
        }
      }
      if (filterDto.endDate) {
        const end = new Date(filterDto.endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }
    }

    const posts = await this.postModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    let nextCursor = null;
    if (posts.length === limit) {
      nextCursor = (posts[posts.length - 1] as any)._id.toString();
    }

    return { posts, nextCursor };
  }

  /**
   * Bulk create posts with strict schema validation.
   * Handles duplicates and invalid references gracefully.
   *
   * @param posts - Array of post data to create
   * @returns Object with created posts and skipped/failed entries
   */
  async bulkCreatePosts(posts: Array<{ authorId: string; author: string; title: string; body: string }>) {
    const results = {
      created: [] as Array<{ _id: string; authorId: string; title: string }>,
      skipped: [] as Array<{ authorId: string; title: string; reason: string }>,
      errors: [] as Array<{ authorId: string; title: string; error: string }>,
    };

    for (const postData of posts) {
      try {
        // Validate authorId format
        if (!this.isValidObjectId(postData.authorId)) {
          results.skipped.push({
            authorId: postData.authorId,
            title: postData.title,
            reason: 'Invalid authorId format',
          });
          continue;
        }

        // Check for duplicate post (same author + title)
        const existingPost = await this.postModel.findOne({
          authorId: postData.authorId,
          title: { $regex: new RegExp(`^${postData.title}$`, 'i') },
        }).exec();

        if (existingPost) {
          results.skipped.push({
            authorId: postData.authorId,
            title: postData.title,
            reason: 'Post with same title already exists for this author',
          });
          continue;
        }

        // Create post
        const post = new this.postModel({
          authorId: postData.authorId,
          author: postData.author,
          title: postData.title,
          body: postData.body,
          commentCount: 0,
          deleted: false,
          recentComments: [],
        });

        const savedPost = await post.save();

        results.created.push({
          _id: savedPost._id.toString(),
          authorId: savedPost.authorId,
          title: savedPost.title,
        });

        this.logger.log(`✅ Created post: ${savedPost.title} by ${savedPost.author}`);
      } catch (error: any) {
        results.errors.push({
          authorId: postData.authorId,
          title: postData.title,
          error: error.message || 'Unknown error',
        });
        this.logger.error(`❌ Failed to create post "${postData.title}": ${error.message}`);
      }
    }

    return results;
  }
}
