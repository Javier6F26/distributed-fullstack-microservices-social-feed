import { Injectable, ConflictException, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { Response, Request } from 'express';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../schemas/user.schema';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { RefreshTokenService } from '../refresh-token/refresh-token.service';

// Security constants
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerUserDto: RegisterUserDto) {
    const { username, email, password } = registerUserDto;

    // Check if email already exists
    const existingEmail = await this.userModel.findOne({ email }).exec();
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check if username already exists
    const existingUsername = await this.userModel.findOne({ username }).exec();
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    // Hash password with bcrypt (10 salt rounds)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const createdUser = await this.userModel.create({
      username,
      email,
      passwordHash,
    });

    // Generate JWT tokens (no clientIp for registration)
    const tokens = await this.generateTokens(createdUser, undefined);

    // Return user data without password
    return {
      message: 'Registration successful',
      user: {
        _id: createdUser._id,
        username: createdUser.username,
        email: createdUser.email,
      },
      ...tokens,
    };
  }

  /**
   * Login user with email/username and password
   */
  async login(loginUserDto: LoginUserDto, clientIp?: string) {
    const { identifier, password } = loginUserDto;

    // Find user by email or username
    const user = await this.userModel.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    }).exec();

    if (!user) {
      // Log failed attempt (user not found)
      await this.logFailedLoginAttempt(identifier, clientIp, 'User not found');
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Check if account is locked due to too many failed attempts
    if (user.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      // Check if lockout should be lifted (15 minutes cooldown)
      const now = new Date().getTime();
      const lastFailedAt = user.lastFailedLoginAt ? new Date(user.lastFailedLoginAt).getTime() : 0;

      if (now - lastFailedAt < LOCKOUT_COOLDOWN_MS) {
        throw new UnauthorizedException('Account locked due to too many failed attempts. Please try again later.');
      }

      // Reset failed attempts after lockout period
      user.failedLoginAttempts = 0;
      await user.save();
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Increment failed login attempts
      await this.incrementFailedLoginAttempts(user, clientIp);
      throw new UnauthorizedException('Invalid password');
    }

    // Successful login - reset failed attempts and log success
    await this.logSuccessfulLogin(user, clientIp);

    // Generate JWT tokens
    const tokens = await this.generateTokens(user, clientIp);

    return {
      message: 'Login successful',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
      },
      ...tokens,
    };
  }

  /**
   * Increment failed login attempts counter
   */
  private async incrementFailedLoginAttempts(user: UserDocument, clientIp?: string) {
    user.failedLoginAttempts += 1;
    user.lastFailedLoginAt = new Date();
    user.lastLoginIp = clientIp || null;
    await user.save();

    // Log failed attempt
    this.logger.warn(`[AUDIT] Failed login attempt for user: ${user.email}, IP: ${clientIp || 'unknown'}, Attempt: ${user.failedLoginAttempts}`);
  }

  /**
   * Log failed login attempt for non-existent user
   */
  private async logFailedLoginAttempt(identifier: string, clientIp?: string, reason?: string) {
    // Log failed attempt for non-existent user
    this.logger.warn(`[AUDIT] Failed login attempt - ${reason}: identifier=${identifier}, IP: ${clientIp || 'unknown'}`);
  }

  /**
   * Log successful login
   */
  private async logSuccessfulLogin(user: UserDocument, clientIp?: string) {
    user.failedLoginAttempts = 0;
    user.lastLoginAt = new Date();
    user.lastLoginIp = clientIp || null;
    await user.save();

    // Log successful login
    this.logger.log(`[AUDIT] Successful login for user: ${user.email} (${user._id}), IP: ${clientIp || 'unknown'}`);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(userId: string, currentRefreshToken: string) {
    const user = await this.userModel.findById(userId).exec();
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify refresh token
    try {
      const payload = await this.jwtService.verifyAsync(currentRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      });

      // Check if token belongs to this user
      if (payload.sub !== user._id) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      return await this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(user: UserDocument, clientIp?: string) {
    const payload = {
      sub: user._id,
      username: user.username,
      email: user.email,
    };

    // Access token: 15 minutes
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      secret: process.env.JWT_SECRET,
    });

    // Refresh token: 7 days (stored in database)
    const refreshTokenResult = await this.refreshTokenService.generateRefreshToken(user._id, clientIp);
    const refreshToken = refreshTokenResult.refreshToken;

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '15m') * 60, // Convert to seconds
    };
  }

  /**
   * Generate only access token (for refresh endpoint)
   */
  async generateAccessToken(userId: string) {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload = {
      sub: user._id,
      username: user.username,
      email: user.email,
    };

    return await this.jwtService.signAsync(payload, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      secret: process.env.JWT_SECRET,
    });
  }

  /**
   * Set refresh token as HttpOnly cookie
   * @param response - Express response object
   * @param refreshToken - The refresh token to set
   * @param rememberMe - If false, creates a session-only cookie (no maxAge, expires on browser close)
   */
  setRefreshTokenCookie(response: Response, refreshToken: string, rememberMe: boolean = true) {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions: any = {
      httpOnly: true,
      secure: isProduction, // Only send over HTTPS in production
      sameSite: 'strict',
      path: '/',
    };

    // When rememberMe is true, set expiry to 7 days
    // When rememberMe is false, omit maxAge to create session-only cookie (expires on browser close)
    if (rememberMe) {
      cookieOptions.maxAge = parseInt(process.env.JWT_REFRESH_EXPIRES_IN) || 7 * 24 * 60 * 60 * 1000; // Default 7 days
    }

    response.cookie('refreshToken', refreshToken, cookieOptions);
  }

  /**
   * Clear refresh token cookie
   */
  clearRefreshTokenCookie(response: Response) {
    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }

  /**
   * Validate user for JWT strategy
   */
  async validateUser(userId: string) {
    const user = await this.userModel.findById(userId).exec();

    if (!user || !user.isActive) {
      return null;
    }

    return {
      _id: user._id,
      username: user.username,
      email: user.email,
    };
  }

  /**
   * Revoke all refresh tokens for a user (used for logout)
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    try {
      const revokedCount = await this.refreshTokenService.revokeAllUserTokens(userId, 'User logout');
      this.logger.log(`Revoked ${revokedCount} refresh tokens for user ${userId}`);
      return revokedCount;
    } catch (error: any) {
      this.logger.error(`Failed to revoke tokens for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Logout user - revoke all tokens and clear cookie
   */
  async logout(userId: string, response: Response): Promise<{ success: boolean; message: string }> {
    // Revoke all refresh tokens
    await this.revokeAllUserTokens(userId);

    // Clear refresh token cookie
    this.clearRefreshTokenCookie(response);

    this.logger.log(`User ${userId} logged out successfully`);

    return {
      success: true,
      message: 'Logout successful',
    };
  }
}
