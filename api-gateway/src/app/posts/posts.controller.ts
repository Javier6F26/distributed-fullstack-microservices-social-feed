import {Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Query, UseGuards, UseInterceptors} from '@nestjs/common';
import {HttpService} from '@nestjs/axios';
import {firstValueFrom} from 'rxjs';
import {Cache, CACHE_MANAGER, CacheInterceptor, CacheTTL} from '@nestjs/cache-manager';
import {ConfigService} from '@nestjs/config';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {RabbitmqService} from '../rabbitmq/rabbitmq.service';
import {CreatePostDto} from './dto/create-post.dto';
import {PostCreateMessage, PostResponse} from '@prueba-tecnica-fullstack-angular-nest-js-mongo-db/shared-types';
import {validate} from 'class-validator';
import {Throttle} from '@nestjs/throttler';

@Controller('posts')
export class PostsController {
    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly rabbitmqService: RabbitmqService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {
    }

    @Get()
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(10000)
    async findAll(@Query('limit') limit?: number, @Query('cursor') cursor?: string) {
        const params: any = {};
        if (limit) params.limit = limit;
        if (cursor) params.cursor = cursor;

        const postServiceUrl = this.configService.get<string>('POST_SERVICE_URL') || 'http://localhost:3002';
        const commentServiceUrl = this.configService.get<string>('COMMENT_SERVICE_URL') || 'http://localhost:3003';

        // Fetch posts from post-service
        const postsResponse = await firstValueFrom(
            this.httpService.get(`${postServiceUrl}/api/posts`, {params}),
        );

        const posts = postsResponse.data.data || [];
        const nextCursor = postsResponse.data.nextCursor;

        // Enrich each post with recent comments from comment-service using Promise.allSettled for resilience
        const commentsResults = await Promise.allSettled(
            posts.map(async (post: any) => {
                try {
                    const commentsResponse = await firstValueFrom(
                        this.httpService.get(`${commentServiceUrl}/api/comments/post/${post._id}?limit=4`, {timeout: 5000}),
                    );
                    return commentsResponse.data.data || [];
                } catch (error) {
                    // If comments service fails, return empty array for this post
                    console.error(`Failed to fetch comments for post ${post._id}:`, error);
                    return [];
                }
            })
        );

        // Map posts with their comments (handling both fulfilled and rejected promises)
        const postsWithComments = posts.map((post: any, index: number) => {
            const result = commentsResults[index];
            const recentComments = result.status === 'fulfilled' ? result.value : [];
            return {...post, recentComments};
        });

        return {success: true, data: postsWithComments, nextCursor};
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

        const postServiceUrl = this.configService.get<string>('POST_SERVICE_URL') || 'http://localhost:3002';

        const response = await firstValueFrom(
            this.httpService.get(`${postServiceUrl}/api/posts/search`, {params}),
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

        const postServiceUrl = this.configService.get<string>('POST_SERVICE_URL') || 'http://localhost:3002';

        const response = await firstValueFrom(
            this.httpService.get(`${postServiceUrl}/api/posts/filter`, {params}),
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

        const postServiceUrl = this.configService.get<string>('POST_SERVICE_URL') || 'http://localhost:3002';

        const response = await firstValueFrom(
            this.httpService.get(`${postServiceUrl}/api/posts/search-filter`, {params}),
        );
        return response.data;
    }

    // Future stories will call this method or use a similar approach to invalidate the cache
    @Post('invalidate-cache')
    async invalidateCache() {
        await this.cacheManager.clear();
        return {success: true, message: 'Cache invalidated'};
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
    async createPost(@Body() dto: CreatePostDto, @Body() req: any): Promise<PostResponse> {
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
            // Extract userId from JWT (guaranteed by JwtStrategy.validate())
            const userId = (req as any).user?.userId;

            if (!userId) {
                return {
                    success: false,
                    message: 'User ID not found in token',
                    status: HttpStatus.UNAUTHORIZED,
                };
            }

            // Generate client-side tempId for optimistic UI correlation
            const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Create RabbitMQ message payload
            const message: PostCreateMessage = {
                userId,
                title: dto.title,
                body: dto.body,
                createdAt: new Date().toISOString(),
                tempId,
            };

            // Publish to RabbitMQ queue
            await this.rabbitmqService.publishPostCreate(message);

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
        } catch (error) {
            // RabbitMQ or other service error
            return {
                success: false,
                message: 'Post creation service temporarily unavailable',
                status: HttpStatus.SERVICE_UNAVAILABLE,
            };
        }
    }

    @Get('post/:postId/comments')
    async getPostComments(@Param('postId') postId: string) {
        const commentServiceUrl = this.configService.get<string>('COMMENT_SERVICE_URL') || 'http://localhost:3003';

        const response = await firstValueFrom(
            this.httpService.get(`${commentServiceUrl}/api/comments/post/${postId}/all`),
        );
        return response.data;
    }
}
