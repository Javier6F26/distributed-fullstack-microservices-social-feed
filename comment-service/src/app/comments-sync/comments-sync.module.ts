import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentsSyncService } from './comments-sync.service';
import { PostSyncTracker, PostSyncTrackerSchema } from '../schemas/post-sync-tracker.schema';
import { Comment, CommentSchema } from '../schemas/comment.schema';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PostSyncTracker.name, schema: PostSyncTrackerSchema },
      { name: Comment.name, schema: CommentSchema },
    ]),
    RabbitmqModule,
  ],
  providers: [CommentsSyncService],
  exports: [CommentsSyncService],
})
export class CommentsSyncModule {}
