import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true, minlength: 3, maxlength: 30 })
  username: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true, minlength: 8 })
  passwordHash: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: SchemaTypes.ObjectId, auto: true })
  _id: string;

  // Login audit tracking
  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop({ type: Date, default: null })
  lastFailedLoginAt: Date;

  @Prop({ type: Date, default: null })
  lastLoginAt: Date;

  @Prop({ type: String, default: null })
  lastLoginIp: string;

  // Account deletion fields (GDPR compliance)
  @Prop({ default: false })
  deleted: boolean;

  @Prop({ type: Date, default: null })
  scheduledDeletionAt: Date;

  @Prop({ type: Date, default: null })
  deletedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create compound index for efficient lookups
UserSchema.index({ email: 1, isActive: 1 });
UserSchema.index({ username: 1, isActive: 1 });

// Virtual for hiding passwordHash in JSON responses
UserSchema.virtual('password').set(function (password: string) {
  this.passwordHash = password;
});

UserSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.failedLoginAttempts;
    delete ret.lastFailedLoginAt;
    delete ret.lastLoginAt;
    delete ret.lastLoginIp;
    delete ret.__v;
    return ret;
  },
});
