import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

/**
 * Data Transfer Object for creating a new post.
 * Used by API Gateway for validation before enqueueing to RabbitMQ.
 *
 * Validation Rules:
 * - title: required, 5-100 characters
 * - body: required, 10-5000 characters
 */
export class CreatePostDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(5, { message: 'Title must be at least 5 characters long' })
  @MaxLength(100, { message: 'Title must not exceed 100 characters' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Body is required' })
  @MinLength(10, { message: 'Body must be at least 10 characters long' })
  @MaxLength(5000, { message: 'Body must not exceed 5000 characters' })
  body!: string;
}
