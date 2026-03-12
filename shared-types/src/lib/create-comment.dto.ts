import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for creating a new comment.
 * Used by API Gateway for validation before enqueueing to RabbitMQ.
 *
 * Validation Rules:
 * - postId: required, valid string
 * - body: required, 1-1000 characters
 */
export class CreateCommentDto {
  @ApiProperty({
    description: 'The ID of the post to comment on',
    example: '60d5ecb5c7f6a92c2c9d9c82',
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Post ID is required' })
  postId!: string;

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
  body!: string;
}
