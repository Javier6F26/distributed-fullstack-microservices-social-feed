import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PostDocument = Post & Document;

/**
 * Post schema for MongoDB.
 * Optimized for feed queries with indexes on createdAt and userId.
 */
@Schema({ collection: 'posts', timestamps: true })
export class Post {
  @Prop({ required: true, type: String })
  userId: string;

  @Prop({ required: true, minlength: 5, maxlength: 100 })
  title: string;

  @Prop({ required: true, minlength: 10, maxlength: 5000 })
  body: string;

  @Prop({ required: true, default: () => new Date().toISOString() })
  createdAt: string;

  @Prop({ required: true, default: 0 })
  commentCount: number;

  @Prop({ required: true, default: false })
  deleted: boolean;

  @Prop({ type: String })
  deletedAt?: string;

  @Prop({ type: Boolean })
  authorDeleted?: boolean;

  @Prop({ type: String })
  authorDeletedAt?: string;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Indexes for feed queries (sorted by createdAt descending)
PostSchema.index({ createdAt: -1 });

// Indexes for user's posts
PostSchema.index({ userId: 1, createdAt: -1 });

// Indexes for deleted posts cleanup
PostSchema.index({ deleted: 1, deletedAt: 1 });

// Index for author deletion tracking
PostSchema.index({ authorDeleted: 1 });
