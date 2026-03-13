import { IsString, MinLength, MaxLength, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for creating a new post.
 * Used by API Gateway for validation before enqueueing to RabbitMQ.
 *
 * Validation Rules:
 * - title: required, 5-100 characters
 * - body: required, 10-5000 characters
 * - tempId: optional, client-generated ID for optimistic UI correlation
 */
export class CreatePostDto {
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
  title!: string;

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
  body!: string;

  @ApiProperty({
    description: 'Client-generated temp ID for optimistic UI correlation',
    example: 'temp_1234567890_abc123',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  tempId?: string;
}
