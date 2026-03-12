import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchPostsDto {
  @ApiPropertyOptional({
    description: 'Search query for full-text search in posts',
    example: 'angular tutorial',
    minLength: 1,
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Search query cannot be empty' })
  q?: string;
}
