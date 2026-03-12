import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PostDocument = Post & Document;

/**
 * Comment interface for recentComments array in Post schema.
 */
export interface Comment {
  _id?: string;
  postId: string;
  name: string;
  email: string;
  body: string;
  createdAt: Date;
}

/**
 * Post schema for MongoDB.
 * Optimized for feed queries with indexes on createdAt and authorId.
 */
@Schema({ collection: 'posts', timestamps: true })
export class Post {
  @Prop({ required: true, type: String })
  authorId: string;

  @Prop({ required: true, type: String })
  author: string;

  @Prop({ required: true, minlength: 5, maxlength: 100 })
  title: string;

  @Prop({ required: true, minlength: 10, maxlength: 5000 })
  body: string;

  @Prop({ required: true, default: () => new Date() })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt?: Date;

  @Prop({ required: true, default: 0 })
  commentCount: number;

  @Prop({ required: true, default: false })
  deleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({ type: Boolean })
  authorDeleted?: boolean;

  @Prop({ type: Date })
  authorDeletedAt?: Date;

  @Prop({ type: Array, default: [] })
  recentComments: Comment[];
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Indexes for feed queries (sorted by createdAt descending)
PostSchema.index({ createdAt: -1 });

// Indexes for user's posts
PostSchema.index({ authorId: 1, createdAt: -1 });

// Indexes for deleted posts cleanup
PostSchema.index({ deleted: 1, deletedAt: 1 });

// Index for author deletion tracking
PostSchema.index({ authorDeleted: 1 });
