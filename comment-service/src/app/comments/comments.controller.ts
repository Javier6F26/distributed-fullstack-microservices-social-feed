import { Controller, Get, Put, Delete, Param, Query, UsePipes, ValidationPipe, Req, HttpCode, HttpStatus, Body, Post as PostDecorator, Logger } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { BulkCreateCommentsDto } from './dto/bulk-create-comments.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('comments-bulk')
@Controller('comments')
export class CommentsController {
  private readonly logger = new Logger(CommentsController.name);

  constructor(private readonly commentsService: CommentsService) {}

  @Get('post/:postId')
  @UsePipes(new ValidationPipe({ transform: true }))
  async findByPostId(
    @Param('postId') postId: string,
    @Query('limit') limit?: number,
  ) {
    const parsedLimit = limit ? parseInt(limit as any, 10) : 4;
    const comments = await this.commentsService.findByPostId(postId, parsedLimit);
    return { success: true, data: comments };
  }

  @Get('post/:postId/all')
  @UsePipes(new ValidationPipe({ transform: true }))
  async findAllByPostId(@Param('postId') postId: string) {
    const comments = await this.commentsService.findAllByPostId(postId);
    return { success: true, data: comments };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const comment = await this.commentsService.findOne(id);
    return { success: true, data: comment };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updates: { body?: string },
    @Req() req: any,
  ) {
    // Get userId from X-User-Id header (forwarded by API Gateway)
    const userId = req.headers['x-user-id'];

    console.log('🔍 Comment-service update - userId from header:', userId);

    if (!userId) {
      return {
        success: false,
        message: 'User ID not found',
        status: HttpStatus.UNAUTHORIZED,
      };
    }

    // Verify ownership
    const existingComment = await this.commentsService.findOne(id);
    if (!existingComment || existingComment.authorId !== userId) {
      return {
        success: false,
        message: 'Forbidden: You can only update your own comments',
        status: HttpStatus.FORBIDDEN,
      };
    }

    const updatedComment = await this.commentsService.updateComment(id, updates);
    return {
      success: true,
      message: 'Comment updated successfully',
      data: updatedComment,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: any) {
    // Get userId from X-User-Id header (forwarded by API Gateway)
    const userId = req.headers['x-user-id'];

    console.log('🔍 Comment-service delete - userId from header:', userId);

    if (!userId) {
      return {
        success: false,
        message: 'User ID not found',
        status: HttpStatus.UNAUTHORIZED,
      };
    }

    // Verify ownership
    const existingComment = await this.commentsService.findOne(id);
    if (!existingComment || existingComment.authorId !== userId) {
      return {
        success: false,
        message: 'Forbidden: You can only delete your own comments',
        status: HttpStatus.FORBIDDEN,
      };
    }

    const deletedComment = await this.commentsService.deleteComment(id);
    return {
      success: true,
      message: 'Comment deleted successfully',
      data: deletedComment,
    };
  }

  /**
   * POST /comments/bulk
   * Bulk create comments with strict schema validation.
   * Development/seeding endpoint - should be protected in production.
   *
   * @param bulkCreateCommentsDto - Array of comments to create
   * @returns Object with created, skipped, and error counts
   */
  @PostDecorator('bulk')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Bulk create comments (for seeding/development)' })
  @ApiResponse({ status: 201, description: 'Comments created successfully' })
  async bulkCreateComments(@Body() bulkCreateCommentsDto: BulkCreateCommentsDto) {
    this.logger.log(`📥 Bulk create request: ${bulkCreateCommentsDto.comments.length} comments`);

    const result = await this.commentsService.bulkCreateComments(bulkCreateCommentsDto.comments);

    this.logger.log(`✅ Bulk create complete: ${result.created.length} created, ${result.skipped.length} skipped, ${result.errors.length} errors`);

    return {
      success: true,
      message: 'Bulk comment creation complete',
      summary: {
        total: bulkCreateCommentsDto.comments.length,
        created: result.created.length,
        skipped: result.skipped.length,
        errors: result.errors.length,
      },
      details: result,
    };
  }
}
