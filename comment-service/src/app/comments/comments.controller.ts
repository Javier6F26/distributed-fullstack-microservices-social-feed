import { Controller, Get, Put, Delete, Param, Query, UsePipes, ValidationPipe, Req, HttpCode, HttpStatus, Body } from '@nestjs/common';
import { CommentsService } from './comments.service';

@Controller('comments')
export class CommentsController {
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
}
