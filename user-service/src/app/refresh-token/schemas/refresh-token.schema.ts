import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RefreshTokenDocument = RefreshToken & Document;

@Schema({ timestamps: true, collection: 'refresh_tokens' })
export class RefreshToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, index: true })
  tokenHash!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ default: false, index: true })
  revoked!: boolean;

  @Prop({ default: null })
  revokedAt!: Date;

  @Prop({ default: null })
  replacedByTokenHash!: string;

  @Prop({ default: null })
  reason!: string;

  @Prop({ default: null })
  lastUsedIp!: string;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// Index for cleanup queries
RefreshTokenSchema.index({ expiresAt: 1, revoked: 1 });

// Index for finding active tokens by user
RefreshTokenSchema.index({ userId: 1, revoked: -1 });
