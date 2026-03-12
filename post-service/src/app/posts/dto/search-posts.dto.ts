import { IsOptional, IsString, MinLength } from 'class-validator';

export class SearchPostsDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Search query cannot be empty' })
  q?: string;
}
