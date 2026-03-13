import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Delete,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  Cache,
  CACHE_MANAGER,
  CacheInterceptor,
  CacheTTL,
} from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import {
  PostCreateMessage,
  PostResponse,
} from '@prueba-tecnica-fullstack-angular-nest-js-mongo-db/shared-types';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Throttle } from '@nestjs/throttler';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly rabbitmqService: RabbitmqService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(10000)
  async findAll(
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    const params: any = {};
    if (limit) params.limit = limit;
    if (cursor) params.cursor = cursor;

    const postServiceUrl =
      this.configService.get<string>('POST_SERVICE_URL') ||
      'http://localhost:3002';

    // Fetch posts from post-service
    const postsResponse = await firstValueFrom(
      this.httpService.get(`${postServiceUrl}/posts`, { params }),
    );

    return postsResponse.data;
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(10000)
  async findOne(@Param('id') id: string) {
    const postServiceUrl =
      this.configService.get<string>('POST_SERVICE_URL') ||
      'http://localhost:3002';
    const commentServiceUrl =
      this.configService.get<string>('COMMENT_SERVICE_URL') ||
      'http://localhost:3003';

    // Fetch single post from post-service
    const postResponse = await firstValueFrom(
      this.httpService.get(`${postServiceUrl}/posts/${id}`),
    );

    const post = postResponse.data.data;

    // Fetch recent comments for this post
    let recentComments = [];
    try {
      const commentsResponse = await firstValueFrom(
        this.httpService.get(
          `${commentServiceUrl}/comments/post/${id}?limit=4`,
          { timeout: 5000 },
        ),
      );
      recentComments = commentsResponse.data.data || [];
    } catch (error) {
      console.error(`Failed to fetch comments for post ${id}:`, error);
    }

    return {
      success: true,
      data: {
        ...post,
        recentComments,
      },
    };
  }

  @Get('search')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // Cache search results for 5 minutes
  async search(
    @Query('q') q?: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    const params: any = {};
    if (q) params.q = q;
    if (limit) params.limit = limit;
    if (cursor) params.cursor = cursor;

    const postServiceUrl =
      this.configService.get<string>('POST_SERVICE_URL') ||
      'http://localhost:3002';

    const response = await firstValueFrom(
      this.httpService.get(`${postServiceUrl}/posts/search`, { params }),
    );
    return response.data;
  }

  @Get('filter')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // Cache filter results for 5 minutes
  async filter(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (limit) params.limit = limit;
    if (cursor) params.cursor = cursor;

    const postServiceUrl =
      this.configService.get<string>('POST_SERVICE_URL') ||
      'http://localhost:3002';

    const response = await firstValueFrom(
      this.httpService.get(`${postServiceUrl}/posts/filter`, { params }),
    );
    return response.data;
  }

  @Get('search-filter')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // Cache combined results for 5 minutes
  async searchAndFilter(
    @Query('q') q?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    const params: any = {};
    if (q) params.q = q;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (limit) params.limit = limit;
    if (cursor) params.cursor = cursor;

    const postServiceUrl =
      this.configService.get<string>('POST_SERVICE_URL') ||
      'http://localhost:3002';

    const response = await firstValueFrom(
      this.httpService.get(`${postServiceUrl}/posts/search-filter`, { params }),
    );
    return response.data;
  }

  // Future stories will call this method or use a similar approach to invalidate the cache
  @Post('invalidate-cache')
  async invalidateCache() {
    await this.cacheManager.clear();
    return { success: true, message: 'Cache invalidated' };
  }

  /**
   * Check pending write status by tempId.
   * Returns confirmed: true with postId if not in cache (deleted after DB save),
   * pending: true if still pending, or error: message if failed.
   */
  @Get('pending/:tempId')
  async checkPending(@Param('tempId') tempId: string) {
    const value = await this.cacheManager.get(`pending:${tempId}`);
    
    if (!value) {
      // Not found = confirmed (deleted from cache after DB save)
      // Check if we have the real postId stored
      const postId = await this.cacheManager.get(`post:tempId:${tempId}`);
      
      if (postId) {
        return { confirmed: true, postId };
      }
      return { confirmed: true };
    }
    if (value === 'error') {
      // Get error message from separate key
      const errorMessage = await this.cacheManager.get(`pending:error:${tempId}`);
      return { error: errorMessage || 'Failed to persist' };
    }
    return { pending: true }; // Still pending
  }

  /**
   * Confirm pending write - delete from cache after successful DB save.
   */
  @Post('pending/:tempId/confirm')
  async confirm(@Param('tempId') tempId: string) {
    await this.cacheManager.del(`pending:${tempId}`);
    await this.cacheManager.del(`pending:error:${tempId}`);
    return { success: true };
  }

  /**
   * Set error status for pending write.
   */
  @Post('pending/:tempId/error')
  async error(@Param('tempId') tempId: string, @Body() body: { message: string }) {
    await this.cacheManager.set(`pending:${tempId}`, 'error', 30000);
    await this.cacheManager.set(`pending:error:${tempId}`, body.message, 30000);
    return { success: true };
  }

  /**
   * Create a new post via RabbitMQ queue.
   * Validates DTO, enqueues message, returns optimistic response.
   *
   * @param dto - CreatePostDto with title and body
   * @param req - Express request (for JWT user extraction)
   * @returns PostResponse with optimistic post data
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per 60 seconds
  @HttpCode(HttpStatus.CREATED)
  async createPost(
    @Body() dto: CreatePostDto,
    @Req() req: any,
  ): Promise<PostResponse> {
    // Convert plain object to CreatePostDto instance for class-validator
    const dtoInstance = plainToInstance(CreatePostDto, dto);
    // Validate DTO using class-validator
    let validationErrors;
    try {
      validationErrors = await validate(dtoInstance);
    } catch (error: any) {
      console.error('Validation error:', error.message);
      console.error('Error stack:', error.stack);
      return {
        success: false,
        message: `Validation error: ${error.message}`,
        errors: [
          {
            message: error.message,
            field: '',
          },
        ],
        status: HttpStatus.BAD_REQUEST,
      };
    }

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
      // Extract userId from JWT (guaranteed by JwtStrategy.validate())
      const userId = req.user?.userId;

      if (!userId) {
        return {
          success: false,
          message: 'User ID not found in token',
          status: HttpStatus.UNAUTHORIZED,
        };
      }

      // Use client-provided tempId if available, otherwise generate one
      const tempId = dtoInstance.tempId || `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Extract author (username) from JWT token
      const author = req.user?.username || 'user';

      // Create RabbitMQ message payload
      const message: PostCreateMessage = {
        userId,
        author,
        title: dtoInstance.title,
        body: dtoInstance.body,
        createdAt: new Date().toISOString(),
        tempId,
      };
      // Publish to RabbitMQ queue
      this.rabbitmqService.publishPostCreate(message);

      // Set Redis key for pending write tracking (30 second TTL)
      await this.cacheManager.set(`pending:${tempId}`, 'pending', 30000);

      // Return optimistic response for immediate UI update

      return {
        success: true,
        message: 'Post created successfully',
        data: {
          ...message,
          pending: true,
          commentCount: 0,
          deleted: false,
        },
      };
    } catch (error: any) {
      console.error('❌ Failed to create post:', error);
      console.error('Error response:', error?.response?.data);
      console.error('Error status:', error?.status);
      console.error('Error message:', error?.message);
      
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Post creation service temporarily unavailable',
        status: error?.status || HttpStatus.SERVICE_UNAVAILABLE,
      };
    }
  }

  @Get('post/:postId/comments')
  async getPostComments(@Param('postId') postId: string) {
    const commentServiceUrl =
      this.configService.get<string>('COMMENT_SERVICE_URL') ||
      'http://localhost:3003';

    const response = await firstValueFrom(
      this.httpService.get(`${commentServiceUrl}/comments/post/${postId}/all`),
    );
    return response.data;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @Req() req: any,
  ): Promise<PostResponse> {
    const postServiceUrl =
      this.configService.get<string>('POST_SERVICE_URL') ||
      'http://localhost:3002';

    console.log('🔍 Debug - Request user:', JSON.stringify(req.user, null, 2));
    console.log('🔍 Debug - Request headers:', req.headers);

    const userId = req.user?.userId;

    if (!userId) {
      console.log('❌ User ID not found in token. req.user:', req.user);
      return {
        success: false,
        message: 'User ID not found in token',
        status: HttpStatus.UNAUTHORIZED,
      };
    }
    console.log('✅ User ID extracted:', userId);

    // First, fetch the post to verify ownership
    try {
      const existingPost = await firstValueFrom(
        this.httpService.get(`${postServiceUrl}/posts/${id}`),
      );

      // httpService.get returns Axios response: { data: { success: true, data: post } }
      // So we need existingPost.data.data to get the actual post
      const postData = existingPost.data.data;
      const postAuthorId = postData?.authorId?.toString();
      const currentUserId = userId?.toString();

      if (!postData || postAuthorId !== currentUserId) {
        console.log('❌ Authorization failed:', { 
          postAuthorId, 
          currentUserId,
          postId: id,
          postData,
        });
        return {
          success: false,
          message: 'Forbidden: You can only update your own posts',
          status: HttpStatus.FORBIDDEN,
        };
      }
      console.log('✅ Authorization passed for post update');
    } catch (error: any) {
      console.error('❌ Error fetching post for authorization:', error.message);
      return {
        success: false,
        message: 'Post not found',
        status: HttpStatus.NOT_FOUND,
      };
    }

    // Validate DTO
    const dtoInstance = plainToInstance(UpdatePostDto, dto);
    const validationErrors = await validate(dtoInstance);

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

    // Call post-service to update
    try {
      const response = await firstValueFrom(
        this.httpService.put(`${postServiceUrl}/posts/${id}`, dto, {
          headers: {
            Authorization: req.headers.authorization,
            'X-User-Id': userId, // Forward userId for post-service authorization
          },
        }),
      );
      console.log('✅ Post update response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Post update error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Post update service temporarily unavailable',
        status: HttpStatus.SERVICE_UNAVAILABLE,
      };
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async delete(@Param('id') id: string, @Req() req: any): Promise<PostResponse> {
    const postServiceUrl =
      this.configService.get<string>('POST_SERVICE_URL') ||
      'http://localhost:3002';

    const userId = req.user?.userId;

    if (!userId) {
      return {
        success: false,
        message: 'User ID not found in token',
        status: HttpStatus.UNAUTHORIZED,
      };
    }

    // First, fetch the post to verify ownership
    try {
      const existingPost = await firstValueFrom(
        this.httpService.get(`${postServiceUrl}/posts/${id}`),
      );

      // httpService.get returns Axios response: { data: { success: true, data: post } }
      const postData = existingPost.data.data;
      const postAuthorId = postData?.authorId?.toString();
      const currentUserId = userId?.toString();

      if (!postData || postAuthorId !== currentUserId) {
        console.log('❌ Authorization failed for delete:', { 
          postAuthorId, 
          currentUserId,
          postId: id,
          postData,
        });
        return {
          success: false,
          message: 'Forbidden: You can only delete your own posts',
          status: HttpStatus.FORBIDDEN,
        };
      }
      console.log('✅ Authorization passed for post delete');
    } catch (error: any) {
      console.error('❌ Error fetching post for delete authorization:', error.message);
      return {
        success: false,
        message: 'Post not found',
        status: HttpStatus.NOT_FOUND,
      };
    }

    // Call post-service to delete
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${postServiceUrl}/posts/${id}`, {
          headers: {
            Authorization: req.headers.authorization,
            'X-User-Id': userId, // Forward userId for post-service authorization
          },
        }),
      );
      console.log('✅ Post delete response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Post delete error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Post delete service temporarily unavailable',
        status: HttpStatus.SERVICE_UNAVAILABLE,
      };
    }
  }
}
