import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from '../schemas/post.schema';
import { SearchPostsDto } from './dto/search-posts.dto';
import { FilterPostsDto } from './dto/filter-posts.dto';
import { PostCreateMessage } from '@prueba-tecnica-fullstack-angular-nest-js-mongo-db/shared-types';

@Injectable()
export class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  /**
   * Create post from RabbitMQ queue message.
   * Called by RabbitmqController when consuming messages.
   * 
   * @param message - PostCreateMessage from queue
   * @returns Created post document
   */
  async createPostFromQueue(message: PostCreateMessage): Promise<PostDocument> {
    const post = new this.postModel({
      userId: message.userId,
      title: message.title,
      body: message.body,
      createdAt: message.createdAt || new Date().toISOString(),
      commentCount: 0,
      deleted: false,
    });

    return await post.save();
  }

  async findAll(limit: number = 20, cursor?: string): Promise<{ posts: Post[]; nextCursor: string | null }> {
    const query: any = {};
    if (cursor) {
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

  async search(searchDto: SearchPostsDto, limit: number = 20, cursor?: string): Promise<{ posts: Post[]; nextCursor: string | null }> {
    const query: any = {};

    // Add cursor-based pagination if provided
    if (cursor) {
      query._id = { $lt: cursor };
    }

    // Add search query if provided
    if (searchDto.q && searchDto.q.trim()) {
      const searchTerm = searchDto.q.trim();
      // Case-insensitive regex search on title and content
      query.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { content: { $regex: searchTerm, $options: 'i' } },
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

  async filter(filterDto: FilterPostsDto, limit: number = 20, cursor?: string): Promise<{ posts: Post[]; nextCursor: string | null }> {
    const query: any = {};
    
    // Add cursor-based pagination if provided
    if (cursor) {
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
    limit: number = 20,
    cursor?: string,
  ): Promise<{ posts: Post[]; nextCursor: string | null }> {
    const query: any = {};

    // Add cursor-based pagination if provided
    if (cursor) {
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
}
