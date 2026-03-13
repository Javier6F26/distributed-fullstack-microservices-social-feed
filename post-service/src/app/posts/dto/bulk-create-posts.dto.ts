import { IsArray, IsNotEmpty, ValidateNested, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Individual post data for bulk creation
 */
export class BulkPostDto {
  @ApiProperty({
    description: 'The ID of the author (userId)',
    example: '60d5ecb5c7f6a92c2c9d9c82',
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Author ID is required' })
  authorId: string;

  @ApiProperty({
    description: 'The username of the author',
    example: 'johndoe',
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Author username is required' })
  author: string;

  @ApiProperty({
    description: 'The title of the post',
    example: 'My Amazing Post',
    type: String,
    minLength: 5,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(5, { message: 'Title must be at least 5 characters long' })
  @MaxLength(100, { message: 'Title must not exceed 100 characters' })
  title: string;

  @ApiProperty({
    description: 'The body content of the post',
    example: 'This is the full content of my amazing post.',
    type: String,
    minLength: 10,
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty({ message: 'Body is required' })
  @MinLength(10, { message: 'Body must be at least 10 characters long' })
  @MaxLength(5000, { message: 'Body must not exceed 5000 characters' })
  body: string;
}

/**
 * Data Transfer Object for bulk post creation.
 * Used for seeding and batch operations.
 *
 * Validation Rules:
 * - posts: required, array of 1-500 posts
 * - Each post must have valid authorId, author, title, and body
 */
export class BulkCreatePostsDto {
  @ApiProperty({
    description: 'Array of posts to create (max 500)',
    type: [BulkPostDto],
    minItems: 1,
    maxItems: 500,
  })
  @IsArray()
  @IsNotEmpty({ message: 'Posts array is required' })
  @ValidateNested({ each: true })
  @Type(() => BulkPostDto)
  posts: BulkPostDto[];
}
