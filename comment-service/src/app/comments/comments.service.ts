import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from '../schemas/comment.schema';
import { CommentCreateMessage } from '@prueba-tecnica-fullstack-angular-nest-js-mongo-db/shared-types';

@Injectable()
export class CommentsService {
  constructor(@InjectModel(Comment.name) private commentModel: Model<CommentDocument>) {}

  /**
   * Create comment from RabbitMQ queue message.
   * Called by RabbitmqController when consuming messages.
   *
   * @param message - CommentCreateMessage from queue
   * @returns Created comment document
   */
  async createCommentFromQueue(message: CommentCreateMessage): Promise<CommentDocument> {
    const comment = new this.commentModel({
      postId: message.postId,
      authorId: message.authorId,
      name: message.name,
      email: message.email,
      body: message.body,
      createdAt: message.createdAt || new Date(),
    });

    return await comment.save();
  }

  /**
   * Find recent comments for a post (for feed display).
   * Returns comments in newest-first order.
   *
   * @param postId - The post ID
   * @param limit - Maximum number of comments to return (default: 4)
   * @returns Array of comments
   */
  async findByPostId(postId: string, limit: number = 4): Promise<Comment[]> {
    const comments = await this.commentModel
      .find({ postId })
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
    const comments = await this.commentModel
      .find({ postId })
      .sort({ createdAt: -1 })
      .exec();

    return comments;
  }
}
