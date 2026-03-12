import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
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
      console.log('Validation failed with errors:', validationErrors);
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

    console.log('✅ Validation passed!');

    try {
      // Extract userId from JWT (guaranteed by JwtStrategy.validate())
      const userId = req.user?.userId;

      if (!userId) {
        console.log('❌ User ID not found in token');
        return {
          success: false,
          message: 'User ID not found in token',
          status: HttpStatus.UNAUTHORIZED,
        };
      }

      // Generate client-side tempId for optimistic UI correlation
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

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
      console.log('Created message:', JSON.stringify(message, null, 2));

      // Publish to RabbitMQ queue
      console.log('Publishing to RabbitMQ...');
      this.rabbitmqService.publishPostCreate(message);
      console.log('✅ Published to RabbitMQ successfully!');

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
      return {
        success: false,
        message: 'Post creation service temporarily unavailable',
        status: HttpStatus.SERVICE_UNAVAILABLE,
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
}
