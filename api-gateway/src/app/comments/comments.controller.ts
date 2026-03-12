import { Controller, Get, Post, Put, Delete, UseInterceptors, Inject, Param, Body, HttpStatus, HttpCode, UseGuards, Query, Req } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentCreateMessage, CommentResponse } from '@prueba-tecnica-fullstack-angular-nest-js-mongo-db/shared-types';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
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
  async createComment(@Body() dto: any, @Req() req: any): Promise<CommentResponse> {
    // Convert plain object to CreateCommentDto instance for class-validator
    const dtoInstance = plainToInstance(CreateCommentDto, dto);
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

    try {
      const userId = (req as any).user?.userId;
      const name = (req as any).user?.username || 'Anonymous';
      const email = (req as any).user?.email || 'anonymous@example.com';

      if (!userId) {
        return {
          success: false,
          message: 'User ID not found in token',
          status: HttpStatus.UNAUTHORIZED,
        };
      }

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const message: CommentCreateMessage = {
        postId: dto.postId,
        authorId: userId,
        name: name,
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

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing comment' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId of the comment', example: '60d5ecb5c7f6a92c2c9d9c82' })
  @ApiBody({ type: UpdateCommentDto })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the comment owner' })
  async updateComment(@Param('id') id: string, @Body() dto: UpdateCommentDto, @Req() req: any): Promise<CommentResponse> {
    const commentServiceUrl = this.configService.get<string>('COMMENT_SERVICE_URL') || 'http://localhost:3003';

    const userId = (req as any).user?.userId;

    if (!userId) {
      return {
        success: false,
        message: 'User ID not found in token',
        status: HttpStatus.UNAUTHORIZED,
      };
    }

    // First, fetch the comment to verify ownership
    try {
      const existingComment = await firstValueFrom(
        this.httpService.get(`${commentServiceUrl}/comments/${id}`),
      );

      // httpService.get returns Axios response: { data: { success: true, data: comment } }
      const commentData = existingComment.data.data;
      const commentAuthorId = commentData?.authorId?.toString();
      const currentUserId = userId?.toString();

      if (!commentData || commentAuthorId !== currentUserId) {
        console.log('❌ Authorization failed for comment update:', {
          commentAuthorId,
          currentUserId,
          commentId: id,
          commentData,
        });
        return {
          success: false,
          message: 'Forbidden: You can only update your own comments',
          status: HttpStatus.FORBIDDEN,
        };
      }
      console.log('✅ Authorization passed for comment update');
    } catch (error: any) {
      console.error('❌ Error fetching comment for authorization:', error.message);
      return {
        success: false,
        message: 'Comment not found',
        status: HttpStatus.NOT_FOUND,
      };
    }

    // Validate DTO
    const dtoInstance = plainToInstance(UpdateCommentDto, dto);
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

    // Call comment-service to update
    try {
      const response = await firstValueFrom(
        this.httpService.put(`${commentServiceUrl}/comments/${id}`, dto, {
          headers: {
            Authorization: req.headers.authorization,
            'X-User-Id': userId, // Forward userId for comment-service authorization
          },
        }),
      );
      console.log('✅ Comment update response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Comment update error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Comment update service temporarily unavailable',
        status: HttpStatus.SERVICE_UNAVAILABLE,
      };
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId of the comment', example: '60d5ecb5c7f6a92c2c9d9c82' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the comment owner' })
  async deleteComment(@Param('id') id: string, @Req() req: any): Promise<CommentResponse> {
    const commentServiceUrl = this.configService.get<string>('COMMENT_SERVICE_URL') || 'http://localhost:3003';

    console.log('🔍 Comment delete - Request user:', JSON.stringify(req.user, null, 2));
    const userId = (req as any).user?.userId;
    console.log('🔍 Comment delete - userId extracted:', userId);

    if (!userId) {
      console.log('❌ Comment delete - User ID not found in token');
      return {
        success: false,
        message: 'User ID not found in token',
        status: HttpStatus.UNAUTHORIZED,
      };
    }
    console.log('✅ Comment delete - Authorization passed, userId:', userId);

    // First, fetch the comment to verify ownership
    try {
      const existingComment = await firstValueFrom(
        this.httpService.get(`${commentServiceUrl}/comments/${id}`),
      );

      // httpService.get returns Axios response: { data: { success: true, data: comment } }
      const commentData = existingComment.data.data;
      const commentAuthorId = commentData?.authorId?.toString();
      const currentUserId = userId?.toString();

      if (!commentData || commentAuthorId !== currentUserId) {
        console.log('❌ Authorization failed for comment delete:', {
          commentAuthorId,
          currentUserId,
          commentId: id,
          commentData,
        });
        return {
          success: false,
          message: 'Forbidden: You can only delete your own comments',
          status: HttpStatus.FORBIDDEN,
        };
      }
      console.log('✅ Authorization passed for comment delete');
    } catch (error: any) {
      console.error('❌ Error fetching comment for delete authorization:', error.message);
      return {
        success: false,
        message: 'Comment not found',
        status: HttpStatus.NOT_FOUND,
      };
    }

    // Call comment-service to delete
    try {
      console.log('📤 Sending delete request to comment-service with userId:', userId);
      const response = await firstValueFrom(
        this.httpService.delete(`${commentServiceUrl}/comments/${id}`, {
          headers: {
            Authorization: req.headers.authorization,
            'X-User-Id': userId, // Forward userId for comment-service authorization
          },
        }),
      );
      console.log('✅ Comment delete response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Comment delete error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Comment delete service temporarily unavailable',
        status: HttpStatus.SERVICE_UNAVAILABLE,
      };
    }
  }
}
