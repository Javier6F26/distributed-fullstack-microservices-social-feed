import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CustomThrottlerGuard } from './throttler.guard';
import {
  DEFAULT_TTL,
  DEFAULT_LIMIT,
  RATE_LIMIT_TTL_KEY,
  RATE_LIMIT_MAX_KEY,
} from './throttler.constants';

/**
 * Global Throttler module for API Gateway.
 * Configures rate limiting with environment variable support.
 */
@Global()
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            // General rate limiting: 100 requests per 60 seconds
            ttl: configService.get<number>(RATE_LIMIT_TTL_KEY) || DEFAULT_TTL,
            limit: configService.get<number>(RATE_LIMIT_MAX_KEY) || DEFAULT_LIMIT,
          },
        ],
        skipIf: (context) => {
          // Skip rate limiting for health checks
          const req = context.switchToHttp().getRequest();
          return req.url === '/health' || req.url === '/api/health';
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
  exports: [ThrottlerModule],
})
export class ThrottlerModuleWrapper {}
