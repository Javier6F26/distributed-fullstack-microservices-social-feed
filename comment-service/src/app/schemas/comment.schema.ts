import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ collection: 'comments', timestamps: true })
export class Comment {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Post' })
  postId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, minlength: 1, maxlength: 1000 })
  body: string;

  @Prop({ required: true, default: () => new Date() })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// Indexes for efficient queries
CommentSchema.index({ postId: 1, createdAt: -1 });
