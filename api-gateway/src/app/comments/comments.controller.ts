import { Controller, Get, Post, UseInterceptors, Inject, Param, Body, HttpStatus, HttpCode, UseGuards, Query } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { CACHE_MANAGER ,Cache} from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentCreateMessage, CommentResponse } from '@prueba-tecnica-fullstack-angular-nest-js-mongo-db/shared-types';
import { validate } from 'class-validator';
import { Throttle } from '@nestjs/throttler';

@Controller('comments')
export class CommentsController {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly rabbitmqService: RabbitmqService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Get all comments for a specific post.
   * Fetches from comment-service and returns with caching.
   *
   * @param postId - The post ID to fetch comments for
   * @returns CommentResponse with comments array
   */
  @Get('post/:postId/all')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(10000) // Cache for 10 seconds
  async getPostComments(@Param('postId') postId: string) {
    const commentServiceUrl = this.configService.get<string>('COMMENT_SERVICE_URL') || 'http://localhost:3003';

    const response = await firstValueFrom(
      this.httpService.get(`${commentServiceUrl}/api/comments/post/${postId}/all`),
    );
    return response.data;
  }

  /**
   * Get recent comments for a post (limited count for feed display).
   * Used in Story 1.4 for initial comment preview.
   *
   * @param postId - The post ID
   * @param limit - Number of comments to fetch (default: 4)
   * @returns CommentResponse with limited comments array
   */
  @Get('post/:postId')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(5000) // Cache for 5 seconds (more dynamic)
  async getRecentComments(@Param('postId') postId: string, @Query('limit') limit?: number) {
    const commentServiceUrl = this.configService.get<string>('COMMENT_SERVICE_URL') || 'http://localhost:3003';
    const limitParam = limit || '4';

    const response = await firstValueFrom(
      this.httpService.get(`${commentServiceUrl}/api/comments/post/${postId}?limit=${limitParam}`),
    );
    return response.data;
  }

  /**
   * Invalidate comments cache (for when new comment is created).
   *
   * @param postId - The post ID to invalidate cache for
   * @returns Success message
   */
  @Post('invalidate-cache/:postId')
  async invalidateCache(@Param('postId') postId: string) {
    // Invalidate specific post comments cache
    // Note: cache-manager doesn't support key-specific invalidation easily
    // For production, consider using Redis with key patterns
    await this.cacheManager.clear()
    return { success: true, message: 'Comments cache invalidated for post ' + postId };
  }

  /**
   * Create a new comment via RabbitMQ queue.
   * Validates DTO, enqueues message, returns optimistic response.
   *
   * @param dto - CreateCommentDto with postId and body
   * @param req - Express request (for JWT user extraction)
   * @returns CommentResponse with optimistic comment data
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per 60 seconds (higher than posts for active discussions)
  @HttpCode(HttpStatus.CREATED)
  async createComment(@Body() dto: CreateCommentDto, @Body() req: any): Promise<CommentResponse> {
    // Validate DTO using class-validator
    const validationErrors = await validate(dto);

    if (validationErrors.length > 0) {
      const errors = validationErrors.map((error) => ({
        field: error.property,
        message: Object.values(error.constraints || {}).join(', '),
      }));

      return {
        success: false,
        message: 'Validation failed',
        errors,
        status: HttpStatus.BAD_REQUEST,
      };
    }

    try {
      // Extract userId and user info from JWT (guaranteed by JwtStrategy.validate())
      const userId = (req as any).user?.userId;
      const username = (req as any).user?.username;
      const avatar = (req as any).user?.avatar;

      if (!userId) {
        return {
          success: false,
          message: 'User ID not found in token',
          status: HttpStatus.UNAUTHORIZED,
        };
      }

      if (!username) {
        return {
          success: false,
          message: 'Username not found in token',
          status: HttpStatus.UNAUTHORIZED,
        };
      }

      // Generate client-side tempId for optimistic UI correlation
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create RabbitMQ message payload
      const message: CommentCreateMessage = {
        postId: dto.postId,
        userId,
        authorUsername: username,
        authorAvatar: avatar,
        body: dto.body,
        createdAt: new Date().toISOString(),
        tempId,
      };

      // Publish to RabbitMQ queue
      await this.rabbitmqService.publishCommentCreate(message);

      // Return optimistic response for immediate UI update
      return {
        success: true,
        message: 'Comment created successfully',
        data: {
          _id: tempId, // Use tempId as optimistic _id
          ...message,
          pending: true,
          deleted: false,
        } as any,
      };
    } catch (error) {
      // RabbitMQ or other service error
      console.error('Failed to create comment:', error);
      return {
        success: false,
        message: 'Comment creation service temporarily unavailable',
        status: HttpStatus.SERVICE_UNAVAILABLE,
      };
    }
  }
}
