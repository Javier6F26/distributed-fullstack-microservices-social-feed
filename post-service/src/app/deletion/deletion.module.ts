import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeletionHandlerService } from './deletion-handler.service';
import { Post, PostSchema } from '../schemas/post.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }]),
  ],
  providers: [DeletionHandlerService],
  exports: [DeletionHandlerService],
})
export class DeletionModule {}
