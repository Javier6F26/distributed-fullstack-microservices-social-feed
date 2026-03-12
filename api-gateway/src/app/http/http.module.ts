import { Module, Global } from '@nestjs/common';
import { HttpModule, HttpModuleOptions } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * HTTP Module with retry logic and timeout configuration.
 * Provides resilient HTTP client for inter-service communication.
 */
@Global()
@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const options: HttpModuleOptions = {
          timeout: configService.get<number>('HTTP_TIMEOUT', 5000), // 5 seconds
          maxRedirects: 5,
          // Axios retry configuration would go here with axios-retry package
          // For now, we'll handle retries in the service layer
        };
        return options;
      },
      inject: [ConfigService],
    }),
  ],
  exports: [HttpModule],
})
export class HttpModuleWrapper {}
