import { IsMongoId, IsOptional, IsInt, Min } from 'class-validator';

export class GetCommentsDto {
  @IsMongoId()
  postId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 4;
}
