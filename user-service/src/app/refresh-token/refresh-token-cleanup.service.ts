import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenService } from '../refresh-token/refresh-token.service';

@Injectable()
export class RefreshTokenCleanupService implements OnModuleInit {
  private readonly logger = new Logger(RefreshTokenCleanupService.name);
  private readonly cleanupIntervalMs: number;

  constructor(
    private refreshTokenService: RefreshTokenService,
    private configService: ConfigService,
  ) {
    // Default to 1 hour (3600000 ms) if not configured
    this.cleanupIntervalMs = this.configService.get<number>('REFRESH_TOKEN_CLEANUP_INTERVAL_MS') || 60 * 60 * 1000;
  }

  onModuleInit() {
    this.logger.log('Refresh token cleanup service initialized');
    this.logger.log(`Cleanup will run every ${this.cleanupIntervalMs / 1000 / 60} minutes`);
  }

  /**
   * Clean up expired refresh tokens at configured interval
   */
  @Interval(60 * 60 * 1000) // Run every hour (keeping hardcoded interval as @Interval decorator doesn't support dynamic values)
  async handleCleanup() {
    try {
      this.logger.log('Starting refresh token cleanup...');
      const deletedCount = await this.refreshTokenService.cleanupExpiredTokens();
      this.logger.log(`Cleanup complete. Deleted ${deletedCount} expired tokens`);
    } catch (error: any) {
      this.logger.error(`Cleanup failed: ${error.message}`, error.stack);
    }
  }
}
