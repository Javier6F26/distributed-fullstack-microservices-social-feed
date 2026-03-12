import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

/**
 * Data Transfer Object for creating a new comment.
 * Used by API Gateway for validation before enqueueing to RabbitMQ.
 *
 * Validation Rules:
 * - postId: required, valid string
 * - body: required, 1-1000 characters
 */
export class CreateCommentDto {
  @IsString()
  @IsNotEmpty({ message: 'Post ID is required' })
  postId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Comment body is required' })
  @MinLength(1, { message: 'Comment body must be at least 1 character long' })
  @MaxLength(1000, { message: 'Comment body must not exceed 1000 characters' })
  body!: string;
}
