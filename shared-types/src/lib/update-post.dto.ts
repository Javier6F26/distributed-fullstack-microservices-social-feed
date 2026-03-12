import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for updating a post.
 * Used by API Gateway for validation before enqueueing to RabbitMQ.
 *
 * All fields are optional for partial updates.
 * Validation Rules (same as CreatePostDto):
 * - title: 5-100 characters
 * - body: 10-5000 characters
 */
export class UpdatePostDto {
  @ApiProperty({
    description: 'The title of the post',
    example: 'My Updated Post',
    type: String,
    minLength: 5,
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'Title must be at least 5 characters long' })
  @MaxLength(100, { message: 'Title must not exceed 100 characters' })
  title?: string;

  @ApiProperty({
    description: 'The body content of the post',
    example: 'This is the updated full content of my post.',
    type: String,
    minLength: 10,
    maxLength: 5000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Body must be at least 10 characters long' })
  @MaxLength(5000, { message: 'Body must not exceed 5000 characters' })
  body?: string;
}
