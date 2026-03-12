import { Controller, Get, Post, UseInterceptors, Inject, Param, Body, HttpStatus, HttpCode, UseGuards, Query } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentCreateMessage, CommentResponse } from '@prueba-tecnica-fullstack-angular-nest-js-mongo-db/shared-types';
import { validate } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('comments')
@Controller('comments')
export class CommentsController {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly rabbitmqService: RabbitmqService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get('post/:postId/all')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(10000)
  @ApiOperation({ summary: 'Get all comments for a post' })
  @ApiParam({ name: 'postId', description: 'MongoDB ObjectId of the post', example: '60d5ecb5c7f6a92c2c9d9c82' })
  @ApiResponse({ status: 200, description: 'Returns all comments for the specified post' })
  async getPostComments(@Param('postId') postId: string) {
    const commentServiceUrl = this.configService.get<string>('COMMENT_SERVICE_URL') || 'http://localhost:3003';

    const response = await firstValueFrom(
      this.httpService.get(`${commentServiceUrl}/comments/post/${postId}/all`),
    );
    return response.data;
  }

  @Get('post/:postId')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(5000)
  @ApiOperation({ summary: 'Get recent comments for a post (limited)' })
  @ApiParam({ name: 'postId', description: 'MongoDB ObjectId of the post', example: '60d5ecb5c7f6a92c2c9d9c82' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of comments to return', example: 4, type: Number })
  @ApiResponse({ status: 200, description: 'Returns recent comments for the specified post' })
  async getRecentComments(@Param('postId') postId: string, @Query('limit') limit?: number) {
    const commentServiceUrl = this.configService.get<string>('COMMENT_SERVICE_URL') || 'http://localhost:3003';
    const limitParam = limit || '4';

    const response = await firstValueFrom(
      this.httpService.get(`${commentServiceUrl}/comments/post/${postId}?limit=${limitParam}`),
    );
    return response.data;
  }

  @Post('invalidate-cache/:postId')
  @ApiOperation({ summary: 'Invalidate comments cache for a post' })
  @ApiParam({ name: 'postId', description: 'MongoDB ObjectId of the post', example: '60d5ecb5c7f6a92c2c9d9c82' })
  @ApiResponse({ status: 200, description: 'Cache invalidated successfully' })
  async invalidateCache(@Param('postId') postId: string) {
    await this.cacheManager.clear()
    return { success: true, message: 'Comments cache invalidated for post ' + postId };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new comment' })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createComment(@Body() dto: CreateCommentDto, @Body() req: any): Promise<CommentResponse> {
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
      const username = (req as any).user?.username || 'Anonymous';
      const email = (req as any).user?.email || 'anonymous@example.com';

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const message: CommentCreateMessage = {
        postId: dto.postId,
        name: username,
        email: email,
        body: dto.body,
        createdAt: new Date().toISOString(),
        tempId,
      };

      await this.rabbitmqService.publishCommentCreate(message);

      return {
        success: true,
        message: 'Comment created successfully',
        data: {
          _id: tempId,
          ...message,
          pending: true,
        } as any,
      };
    } catch (error) {
      console.error('Failed to create comment:', error);
      return {
        success: false,
        message: 'Comment creation service temporarily unavailable',
        status: HttpStatus.SERVICE_UNAVAILABLE,
      };
    }
  }
}
