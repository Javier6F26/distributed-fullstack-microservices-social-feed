import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { SeedingController } from '../seeding/seeding.controller';
import { SeedingService } from '../seeding/seeding.service';
import { Post, PostSchema } from '../schemas/post.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }]),
  ],
  controllers: [PostsController, SeedingController],
  providers: [PostsService, SeedingService],
  exports: [PostsService, SeedingService],
})
export class PostsModule {}
