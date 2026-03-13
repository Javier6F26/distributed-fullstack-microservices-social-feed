import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PostSyncTrackerDocument = PostSyncTracker & Document;

@Schema({ collection: 'post_sync_trackers', timestamps: false })
export class PostSyncTracker {
  @Prop({ required: true, type: Types.ObjectId, unique: true, index: true })
  postId!: Types.ObjectId;

  @Prop({ type: Date })
  lastCommentsSyncAt?: Date;
}

export const PostSyncTrackerSchema = SchemaFactory.createForClass(PostSyncTracker);

// Index for efficient queries
PostSyncTrackerSchema.index({ lastCommentsSyncAt: 1 });
