import { IsArray, IsNotEmpty, ValidateNested, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Individual comment data for bulk creation
 */
export class BulkCommentDto {
  @ApiProperty({
    description: 'The ID of the post to comment on',
    example: '60d5ecb5c7f6a92c2c9d9c82',
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Post ID is required' })
  postId: string;

  @ApiProperty({
    description: 'The ID of the author (userId)',
    example: '60d5ecb5c7f6a92c2c9d9c82',
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Author ID is required' })
  authorId: string;

  @ApiProperty({
    description: 'The name of the commenter',
    example: 'John Doe',
    type: String,
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(1, { message: 'Name must be at least 1 character long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  @ApiProperty({
    description: 'The email of the commenter',
    example: 'john@example.com',
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @ApiProperty({
    description: 'The content of the comment',
    example: 'Great post! Very informative.',
    type: String,
    minLength: 1,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty({ message: 'Comment body is required' })
  @MinLength(1, { message: 'Comment body must be at least 1 character long' })
  @MaxLength(1000, { message: 'Comment body must not exceed 1000 characters' })
  body: string;
}

/**
 * Data Transfer Object for bulk comment creation.
 * Used for seeding and batch operations.
 *
 * Validation Rules:
 * - comments: required, array of 1-1000 comments
 * - Each comment must have valid postId, authorId, name, email, and body
 */
export class BulkCreateCommentsDto {
  @ApiProperty({
    description: 'Array of comments to create (max 1000)',
    type: [BulkCommentDto],
    minItems: 1,
    maxItems: 1000,
  })
  @IsArray()
  @IsNotEmpty({ message: 'Comments array is required' })
  @ValidateNested({ each: true })
  @Type(() => BulkCommentDto)
  comments: BulkCommentDto[];
}
