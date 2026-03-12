import { Module, Global } from '@nestjs/common';
import { LoggingService } from './logging.service';

/**
 * Global Logging Module for API Gateway.
 */
@Global()
@Module({
  providers: [LoggingService],
  exports: [LoggingService],
})
export class LoggingModule {}
