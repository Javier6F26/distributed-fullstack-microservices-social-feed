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
   * Uses insertMany for efficient batch database operations.
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

    const usersToInsert: Array<{ username: string; email: string; passwordHash: string }> = [];
    const userIndexMap: Map<number, number> = new Map(); // Maps insert index to original user index

    // Pre-process: check duplicates and prepare users for insertion
    for (let i = 0; i < users.length; i++) {
      const userData = users[i];
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

        // Add to insert batch
        userIndexMap.set(usersToInsert.length, i);
        usersToInsert.push({
          username: userData.username,
          email: userData.email,
          passwordHash,
        });
      } catch (error: any) {
        results.errors.push({
          username: userData.username,
          email: userData.email,
          error: error.message || 'Unknown error',
        });
        this.logger.error(`❌ Failed to prepare user ${userData.username}: ${error.message}`);
      }
    }

    // Bulk insert all users at once using insertMany
    if (usersToInsert.length > 0) {
      try {
        const insertResult = await this.userModel.insertMany(usersToInsert, { ordered: false });
        
        for (let i = 0; i < insertResult.length; i++) {
          const savedUser = insertResult[i];
          results.created.push({
            _id: savedUser._id.toString(),
            username: savedUser.username,
            email: savedUser.email,
          });
          this.logger.log(`✅ Created user: ${savedUser.username} (${savedUser.email})`);
        }
      } catch (error: any) {
        this.logger.error(`❌ Bulk insert failed: ${error.message}`);
        // Handle partial failures from ordered: false
        if (error.writeErrors) {
          for (const writeError of error.writeErrors) {
            const originalIndex = userIndexMap.get(writeError.index);
            if (originalIndex !== undefined) {
              const userData = users[originalIndex];
              results.errors.push({
                username: userData.username,
                email: userData.email,
                error: writeError.errmsg || 'Insert failed',
              });
            }
          }
        }
      }
    }

    return results;
  }
}
