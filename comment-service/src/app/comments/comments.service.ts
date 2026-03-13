import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument } from '../schemas/comment.schema';
import { CommentCreateMessage, PostComment } from '@prueba-tecnica-fullstack-angular-nest-js-mongo-db/shared-types';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    private readonly rabbitmqService: RabbitmqService,
  ) {}

  /**
   * Create comment from RabbitMQ queue message.
   * Called by RabbitmqController when consuming messages.
   *
   * @param message - CommentCreateMessage from queue
   * @returns Created comment document
   * 
   * NOTE: tempId is NEVER stored in the database. It is only used for:
   * - Optimistic UI correlation on the frontend
   * - RabbitMQ event payload for API Gateway pending write confirmation
   * - Redis cache key (30 second TTL) for polling-based confirmation
   */
  async createCommentFromQueue(message: CommentCreateMessage): Promise<CommentDocument> {
    // Convert postId to ObjectId if it's a valid ObjectId string
    const postIdObj = Types.ObjectId.isValid(message.postId)
      ? new Types.ObjectId(message.postId)
      : message.postId;

    const comment = new this.commentModel({
      postId: postIdObj,
      authorId: message.authorId,
      name: message.name,
      email: message.email,
      body: message.body,
      createdAt: message.createdAt || new Date(),
    });

    try {
      const savedComment = await comment.save();
      this.logger.log(`✅ Created comment ${savedComment._id}`);

      // Fetch top 10 recent comments and emit event with tempId
      const recentComments = await this.fetchRecentComments(message.postId, 10);
      await this.rabbitmqService.emitCommentCreated(
        message.postId,
        savedComment._id.toString(),
        recentComments,
        message.tempId,
      );

      return savedComment;
    } catch (error: any) {
      this.logger.error(`❌ Failed to create comment: ${error.message}`);

      // Emit comment.create.failed event with tempId for API Gateway to mark as error
      if (message.tempId) {
        await this.rabbitmqService.emitCommentCreateFailed(message.tempId, error.message || 'Failed to save comment');
      }

      throw error;
    }
  }

  /**
   * Update comment by ID.
   *
   * @param commentId - The comment ID to update
   * @param updates - The updates to apply
   * @returns Updated comment document
   */
  async updateComment(commentId: string, updates: { body?: string }): Promise<CommentDocument> {
    const updatedComment = await this.commentModel
      .findByIdAndUpdate(
        commentId,
        { ...updates },
        { new: true, timestamps: false },
      )
      .exec();

    if (!updatedComment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    // Fetch top 10 recent comments and emit event
    const recentComments = await this.fetchRecentComments(updatedComment.postId.toString(), 10);
    await this.rabbitmqService.emitCommentUpdated(
      updatedComment.postId.toString(),
      commentId,
      recentComments,
    );

    return updatedComment;
  }

  /**
   * Delete comment by ID.
   *
   * @param commentId - The comment ID to delete
   * @returns Deleted comment document
   */
  async deleteComment(commentId: string): Promise<CommentDocument> {
    const deletedComment = await this.commentModel
      .findByIdAndDelete(commentId)
      .exec();

    if (!deletedComment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    // Fetch top 10 recent comments and emit event
    const recentComments = await this.fetchRecentComments(deletedComment.postId.toString(), 10);
    await this.rabbitmqService.emitCommentDeleted(
      deletedComment.postId.toString(),
      commentId,
      recentComments,
    );

    return deletedComment;
  }

  /**
   * Fetch top N recent comments for a post.
   * Returns comments in newest-first order.
   *
   * @param postId - The post ID
   * @param limit - Maximum number of comments to return
   * @returns Array of PostComment objects for embedding in Post document
   */
  private async fetchRecentComments(postId: string, limit: number): Promise<PostComment[]> {
    // Convert to ObjectId if valid
    const queryId = Types.ObjectId.isValid(postId) 
      ? new Types.ObjectId(postId) 
      : postId;
    
    const comments = await this.commentModel
      .find({ postId: queryId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    return comments.map((comment) => ({
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

  /**
   * Find a single comment by ID.
   *
   * @param commentId - The comment ID to find
   * @returns Comment document or null if not found
   */
  async findOne(commentId: string): Promise<CommentDocument | null> {
    if (!Types.ObjectId.isValid(commentId)) {
      this.logger.warn(`Invalid commentId: ${commentId}`);
      return null;
    }

    return await this.commentModel
      .findOne({ _id: new Types.ObjectId(commentId) })
      .exec();
  }

  /**
   * Find recent comments for a post (for feed display).
   * Returns comments in newest-first order.
   *
   * @param postId - The post ID
   * @param limit - Maximum number of comments to return (default: 4)
   * @returns Array of comments
   */
  async findByPostId(postId: string, limit = 4): Promise<Comment[]> {
    // Convert postId to ObjectId if valid
    const queryId = Types.ObjectId.isValid(postId)
      ? new Types.ObjectId(postId)
      : postId;

    const comments = await this.commentModel
      .find({ postId: queryId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    return comments;
  }

  /**
   * Find all comments for a post.
   * Returns comments in newest-first order.
   *
   * @param postId - The post ID
   * @returns Array of all comments
   */
  async findAllByPostId(postId: string): Promise<Comment[]> {
    // Convert postId to ObjectId if valid
    const queryId = Types.ObjectId.isValid(postId)
      ? new Types.ObjectId(postId)
      : postId;

    const comments = await this.commentModel
      .find({ postId: queryId })
      .sort({ createdAt: -1 })
      .exec();

    return comments;
  }

  /**
   * Bulk create comments with strict schema validation.
   * Handles duplicates and invalid references gracefully.
   *
   * @param comments - Array of comment data to create
   * @returns Object with created comments and skipped/failed entries
   */
  async bulkCreateComments(comments: Array<{
    postId: string;
    authorId: string;
    name: string;
    email: string;
    body: string;
  }>) {
    const results = {
      created: [] as Array<{ _id: string; postId: string; authorId: string; name: string }>,
      skipped: [] as Array<{ postId: string; authorId: string; name: string; reason: string }>,
      errors: [] as Array<{ postId: string; authorId: string; name: string; error: string }>,
    };

    for (const commentData of comments) {
      try {
        // Validate postId format
        if (!Types.ObjectId.isValid(commentData.postId)) {
          results.skipped.push({
            postId: commentData.postId,
            authorId: commentData.authorId,
            name: commentData.name,
            reason: 'Invalid postId format',
          });
          continue;
        }

        // Validate authorId format (should be valid ObjectId or string)
        if (!commentData.authorId || commentData.authorId.trim() === '') {
          results.skipped.push({
            postId: commentData.postId,
            authorId: commentData.authorId,
            name: commentData.name,
            reason: 'Invalid or empty authorId',
          });
          continue;
        }

        // Check for duplicate comment (same post + author + body)
        const existingComment = await this.commentModel.findOne({
          postId: commentData.postId,
          authorId: commentData.authorId,
          body: { $regex: new RegExp(`^${commentData.body}$`, 'i') },
        }).exec();

        if (existingComment) {
          results.skipped.push({
            postId: commentData.postId,
            authorId: commentData.authorId,
            name: commentData.name,
            reason: 'Duplicate comment (same post, author, and body)',
          });
          continue;
        }

        // Create comment
        const comment = new this.commentModel({
          postId: new Types.ObjectId(commentData.postId),
          authorId: commentData.authorId,
          name: commentData.name,
          email: commentData.email,
          body: commentData.body,
        });

        const savedComment = await comment.save();

        results.created.push({
          _id: savedComment._id.toString(),
          postId: savedComment.postId.toString(),
          authorId: savedComment.authorId,
          name: savedComment.name,
        });

        this.logger.log(`✅ Created comment: ${savedComment.name} on post ${savedComment.postId}`);
      } catch (error: any) {
        results.errors.push({
          postId: commentData.postId,
          authorId: commentData.authorId,
          name: commentData.name,
          error: error.message || 'Unknown error',
        });
        this.logger.error(`❌ Failed to create comment by ${commentData.name}: ${error.message}`);
      }
    }

    return results;
  }
}
