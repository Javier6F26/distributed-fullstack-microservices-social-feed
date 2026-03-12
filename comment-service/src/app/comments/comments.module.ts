import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { SeedingController } from '../seeding/seeding.controller';
import { SeedingService } from '../seeding/seeding.service';
import { Comment, CommentSchema } from '../schemas/comment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Comment.name, schema: CommentSchema }]),
  ],
  controllers: [CommentsController, SeedingController],
  providers: [CommentsService, SeedingService],
  exports: [CommentsService, SeedingService],
})
export class CommentsModule {}
