import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Generate a new refresh token and store its metadata
   */
  async generateRefreshToken(userId: any, clientIp?: string): Promise<{
    refreshToken: string;
    tokenHash: string;
    expiresAt: Date;
  }> {
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
      },
    );

    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = this.calculateExpiryDate();

    // Store refresh token metadata
    await this.refreshTokenModel.create({
      userId,
      tokenHash,
      expiresAt,
      lastUsedIp: clientIp || null,
    });

    return {
      refreshToken,
      tokenHash,
      expiresAt,
    };
  }

  /**
   * Validate a refresh token
   * Logs security audit events for failed validation attempts
   */
  async validateRefreshToken(
    refreshToken: string,
    clientIp?: string,
  ): Promise<{
    isValid: boolean;
    userId: any | null;
    token: RefreshTokenDocument | null;
    reason?: string;
  }> {
    const tokenHash = this.hashToken(refreshToken);

    // Find token in database
    const storedToken = await this.refreshTokenModel
      .findOne({ tokenHash })
      .populate('userId')
      .exec();

    if (!storedToken) {
      this.logger.warn(`Refresh token not found`);
      this.logSecurityAudit('REFRESH_TOKEN_NOT_FOUND', null, clientIp, { tokenHash });
      return {
        isValid: false,
        userId: null,
        token: null,
        reason: 'Token not found',
      };
    }

    // Check if token is revoked
    if (storedToken.revoked) {
      this.logger.warn(`Refresh token revoked for user ${storedToken.userId}`);
      this.logSecurityAudit('REFRESH_TOKEN_REVOKED', storedToken.userId, clientIp, {
        tokenId: storedToken._id,
        revokedAt: storedToken.revokedAt,
        reason: storedToken.reason,
      });
      return {
        isValid: false,
        userId: null,
        token: null,
        reason: 'Token revoked',
      };
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      this.logger.warn(`Refresh token expired for user ${storedToken.userId}`);
      this.logSecurityAudit('REFRESH_TOKEN_EXPIRED', storedToken.userId, clientIp, {
        tokenId: storedToken._id,
        expiresAt: storedToken.expiresAt,
      });
      return {
        isValid: false,
        userId: null,
        token: null,
        reason: 'Token expired',
      };
    }

    // Verify JWT signature
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Update last used IP
      if (clientIp) {
        storedToken.lastUsedIp = clientIp;
        await storedToken.save();
      }

      return {
        isValid: true,
        userId: storedToken.userId,
        token: storedToken,
      };
    } catch (error: any) {
      this.logger.warn(`Invalid refresh token signature: ${error.message}`);
      this.logSecurityAudit('REFRESH_TOKEN_INVALID_SIGNATURE', storedToken.userId, clientIp, {
        tokenId: storedToken._id,
        error: error.message,
      });
      return {
        isValid: false,
        userId: null,
        token: null,
        reason: 'Invalid token signature',
      };
    }
  }

  /**
   * Log security audit event for refresh token operations
   */
  private logSecurityAudit(
    event: string,
    userId: any,
    clientIp?: string,
    metadata?: Record<string, any>,
  ): void {
    const auditLog = {
      timestamp: new Date().toISOString(),
      event,
      userId: userId?.toString() || 'unknown',
      clientIp: clientIp || 'unknown',
      ...metadata,
    };

    // Log in structured format for security monitoring
    this.logger.warn(`[SECURITY_AUDIT] ${JSON.stringify(auditLog)}`);

    // In production, this could be sent to a dedicated security logging service
    // For now, logging to console with SECURITY_AUDIT prefix for easy filtering
  }

  /**
   * Revoke a refresh token (add to blacklist)
   */
  async revokeRefreshToken(
    token: RefreshTokenDocument,
    reason: string = 'Token revoked',
  ): Promise<RefreshTokenDocument> {
    token.revoked = true;
    token.revokedAt = new Date();
    token.reason = reason;
    await token.save();

    this.logger.debug(`Refresh token revoked: ${reason}`);

    return token;
  }

  /**
   * Rotate refresh token - revoke old one and issue new one
   * Tracks the rotation chain by linking old token to new one via replacedByTokenHash
   */
  async rotateRefreshToken(
    oldToken: RefreshTokenDocument,
    clientIp?: string,
  ): Promise<{
    refreshToken: string;
    tokenHash: string;
    expiresAt: Date;
  }> {
    // Revoke old token
    await this.revokeRefreshToken(oldToken, 'Token rotated');

    // Generate new token
    const newToken = await this.generateRefreshToken(oldToken.userId, clientIp);

    // Link old token to new one for audit trail
    oldToken.replacedByTokenHash = newToken.tokenHash;
    await oldToken.save();

    this.logger.debug(`Refresh token rotated for user ${oldToken.userId}`);

    return newToken;
  }

  /**
   * Get the full rotation chain for a token (for security audits)
   * Returns all tokens from the original to the current one
   */
  async getTokenRotationChain(tokenHash: string): Promise<RefreshTokenDocument[]> {
    const chain: RefreshTokenDocument[] = [];
    let currentHash = tokenHash;

    // Find the original token in the chain (one without replacedByTokenHash pointing to it)
    let token = await this.refreshTokenModel.findOne({ tokenHash: currentHash }).exec();
    if (!token) {
      return chain;
    }

    // Work backwards to find the root token
    while (token) {
      chain.unshift(token); // Add to beginning of array
      if (!token.replacedByTokenHash) {
        break; // This is the root
      }
      token = await this.refreshTokenModel.findOne({ tokenHash: token.replacedByTokenHash }).exec();
    }

    return chain;
  }

  /**
   * Clean up expired refresh tokens from database
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    this.logger.log(`Cleaned up ${result.deletedCount} expired refresh tokens`);

    return result.deletedCount;
  }

  /**
   * Revoke all refresh tokens for a user (e.g., on logout or password change)
   */
  async revokeAllUserTokens(userId: any, reason: string = 'User logout'): Promise<number> {
    const result = await this.refreshTokenModel.updateMany(
      { userId, revoked: false },
      {
        $set: {
          revoked: true,
          revokedAt: new Date(),
          reason,
        },
      },
    );

    this.logger.debug(`Revoked ${result.modifiedCount} tokens for user ${userId}`);

    return result.modifiedCount;
  }

  /**
   * Hash a token for secure storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Calculate token expiry date based on config
   */
  private calculateExpiryDate(): Date {
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const now = new Date();

    // Parse expiry string (e.g., '7d', '24h')
    const match = expiresIn.match(/^(\d+)([dhdw])$/);
    if (!match) {
      // Default to 7 days
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'w':
        return new Date(now.getTime() + value * 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}
