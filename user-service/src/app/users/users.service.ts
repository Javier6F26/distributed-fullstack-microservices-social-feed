import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  /**
   * Get user profile (without sensitive data)
   */
  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-passwordHash').exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      createdAt: (user as UserDocument & { createdAt?: Date }).createdAt,
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateData: Partial<User>) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true },
    ).select('-passwordHash').exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Bulk create users with strict schema validation.
   * Hashes passwords and handles duplicates gracefully.
   *
   * @param users - Array of user data to create
   * @returns Object with created users and skipped duplicates
   */
  async bulkCreateUsers(users: Array<{ username: string; email: string; password: string }>) {
    const results = {
      created: [] as Array<{ _id: string; username: string; email: string }>,
      skipped: [] as Array<{ username: string; email: string; reason: string }>,
      errors: [] as Array<{ username: string; email: string; error: string }>,
    };

    for (const userData of users) {
      try {
        // Check for existing user
        const existingUser = await this.userModel.findOne({
          $or: [{ email: userData.email }, { username: userData.username }],
        }).exec();

        if (existingUser) {
          results.skipped.push({
            username: userData.username,
            email: userData.email,
            reason: existingUser.email === userData.email ? 'Email already exists' : 'Username already exists',
          });
          continue;
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(userData.password, saltRounds);

        // Create user
        const user = new this.userModel({
          username: userData.username,
          email: userData.email,
          passwordHash,
        });

        const savedUser = await user.save();

        results.created.push({
          _id: savedUser._id.toString(),
          username: savedUser.username,
          email: savedUser.email,
        });

        this.logger.log(`✅ Created user: ${savedUser.username} (${savedUser.email})`);
      } catch (error: any) {
        results.errors.push({
          username: userData.username,
          email: userData.email,
          error: error.message || 'Unknown error',
        });
        this.logger.error(`❌ Failed to create user ${userData.username}: ${error.message}`);
      }
    }

    return results;
  }
}
