import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentDocument = Comment & Document;

/**
 * Comment Schema with automatic timestamps (createdAt, updatedAt).
 * updatedAt is used to detect if a comment has been edited.
 */
@Schema({ 
  collection: 'comments', 
  timestamps: true, // Automatically manages createdAt and updatedAt
})
export class Comment {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Post' })
  postId: Types.ObjectId;

  @Prop({ required: true, type: String })
  authorId: string;

  @Prop({ required: true, type: String })
  name: string;

  @Prop({ required: true, type: String })
  email: string;

  @Prop({ required: true, minlength: 1, maxlength: 1000 })
  body: string;

  // Managed automatically by Mongoose timestamps: true
  @Prop()
  createdAt: Date;

  // Managed automatically by Mongoose timestamps: true
  // Used to detect if comment has been edited
  @Prop()
  updatedAt: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// Indexes for efficient queries
CommentSchema.index({ postId: 1, createdAt: -1 });
CommentSchema.index({ authorId: 1, createdAt: -1 });
