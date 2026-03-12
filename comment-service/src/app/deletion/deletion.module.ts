import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeletionHandlerService } from './deletion-handler.service';
import { Comment, CommentSchema } from '../schemas/comment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Comment.name, schema: CommentSchema }]),
  ],
  providers: [DeletionHandlerService],
  exports: [DeletionHandlerService],
})
export class DeletionModule {}
