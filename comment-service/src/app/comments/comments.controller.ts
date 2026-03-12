import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
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
}
