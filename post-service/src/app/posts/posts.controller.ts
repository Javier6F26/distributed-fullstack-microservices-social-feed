import { Controller, Get, Query, Put, Delete, Param, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { PostsService } from './posts.service';
import { SearchPostsDto } from './dto/search-posts.dto';
import { FilterPostsDto } from './dto/filter-posts.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async findAll(@Query('limit') limit?: number, @Query('cursor') cursor?: string) {
    const parsedLimit = limit ? parseInt(limit as any, 10) : 20;
    const { posts, nextCursor } = await this.postsService.findAll(parsedLimit, cursor);
    return { success: true, data: posts, nextCursor };
  }

  @Get('search')
  async search(
    @Query() searchDto: SearchPostsDto,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit as any, 10) : 20;
    const { posts, nextCursor } = await this.postsService.search(searchDto, parsedLimit, cursor);
    return { success: true, data: posts, nextCursor };
  }

  @Get('filter')
  async filter(
    @Query() filterDto: FilterPostsDto,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit as any, 10) : 20;
    const { posts, nextCursor } = await this.postsService.filter(filterDto, parsedLimit, cursor);
    return { success: true, data: posts, nextCursor };
  }

  @Get('search-filter')
  async searchAndFilter(
    @Query() searchDto: SearchPostsDto,
    @Query() filterDto: FilterPostsDto,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit as any, 10) : 20;
    const { posts, nextCursor } = await this.postsService.searchAndFilter(searchDto, filterDto, parsedLimit, cursor);
    return { success: true, data: posts, nextCursor };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const post = await this.postsService.findOne(id);
    return { success: true, data: post };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updates: { title?: string; body?: string },
    @Req() req: any,
  ) {
    // Get userId from X-User-Id header (forwarded by API Gateway)
    const userId = req.headers['x-user-id'] || req.user?.userId;

    console.log('🔍 Post-service update - userId from header:', req.headers['x-user-id']);
    console.log('🔍 Post-service update - req.user:', req.user);
    console.log('🔍 Post-service update - final userId:', userId);

    if (!userId) {
      return {
        success: false,
        message: 'User ID not found in token',
        status: HttpStatus.UNAUTHORIZED,
      };
    }

    // Verify ownership
    const existingPost = await this.postsService.findOne(id);
    if (!existingPost || existingPost.authorId !== userId) {
      return {
        success: false,
        message: 'Forbidden: You can only update your own posts',
        status: HttpStatus.FORBIDDEN,
      };
    }

    const updatedPost = await this.postsService.updatePost(id, updates);
    return {
      success: true,
      message: 'Post updated successfully',
      data: updatedPost,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: any) {
    // Get userId from X-User-Id header (forwarded by API Gateway)
    const userId = req.headers['x-user-id'] || req.user?.userId;

    console.log('🔍 Post-service delete - userId from header:', req.headers['x-user-id']);
    console.log('🔍 Post-service delete - req.user:', req.user);
    console.log('🔍 Post-service delete - final userId:', userId);

    if (!userId) {
      return {
        success: false,
        message: 'User ID not found in token',
        status: HttpStatus.UNAUTHORIZED,
      };
    }

    // Verify ownership
    const existingPost = await this.postsService.findOne(id);
    if (!existingPost || existingPost.authorId !== userId) {
      return {
        success: false,
        message: 'Forbidden: You can only delete your own posts',
        status: HttpStatus.FORBIDDEN,
      };
    }

    const deletedPost = await this.postsService.deletePost(id);
    return {
      success: true,
      message: 'Post deleted successfully',
      data: deletedPost,
    };
  }
}
