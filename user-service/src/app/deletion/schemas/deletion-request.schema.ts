import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type DeletionRequestDocument = DeletionRequest & Document;

export enum DeletionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class DeletionRequest {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ type: String, enum: DeletionStatus, default: DeletionStatus.PENDING })
  status: DeletionStatus;

  @Prop({ required: true })
  requestedAt: Date;

  @Prop({ required: true })
  scheduledDeletionAt: Date;

  @Prop({ type: Date, default: null })
  completedAt: Date;

  @Prop({ type: String, default: null })
  reason: string;

  @Prop({ type: String, default: null })
  ipAddress: string;

  @Prop({ default: false })
  emailSent: boolean;

  @Prop({ type: Date, default: null })
  emailSentAt: Date;
}

export const DeletionRequestSchema = SchemaFactory.createForClass(DeletionRequest);

// Index for efficient queries
DeletionRequestSchema.index({ userId: 1, status: 1 });
DeletionRequestSchema.index({ scheduledDeletionAt: 1, status: 1 });
