import { Controller, Get, Query } from '@nestjs/common';
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
}
