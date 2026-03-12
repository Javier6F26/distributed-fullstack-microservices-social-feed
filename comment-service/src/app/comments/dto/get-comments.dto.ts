import { IsMongoId, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetCommentsDto {
  @ApiProperty({
    description: 'MongoDB ObjectId of the post to get comments for',
    example: '60d5ecb5c7f6a92c2c9d9c82',
  })
  @IsMongoId()
  postId: string;

  @ApiPropertyOptional({
    description: 'Maximum number of comments to return',
    example: 4,
    default: 4,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 4;
}
