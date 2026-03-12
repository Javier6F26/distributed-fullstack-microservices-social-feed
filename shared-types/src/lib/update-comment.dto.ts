import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for updating a comment.
 * Used by API Gateway for validation before sending to Comment Service.
 *
 * All fields are optional for partial updates.
 * Validation Rules (same as CreateCommentDto):
 * - body: 1-1000 characters
 */
export class UpdateCommentDto {
  @ApiProperty({
    description: 'The content of the comment',
    example: 'This is my updated comment.',
    type: String,
    minLength: 1,
    maxLength: 1000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Comment body must be at least 1 character long' })
  @MaxLength(1000, { message: 'Comment body must not exceed 1000 characters' })
  body?: string;
}
