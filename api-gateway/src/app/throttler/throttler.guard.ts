import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { ThrottlerLimitDetail } from '@nestjs/throttler/dist/throttler.guard.interface';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected override async throwThrottlingException(context: ExecutionContext, throttlerLimitDetail: ThrottlerLimitDetail): Promise<void> {
    const retryAfter = Math.ceil(throttlerLimitDetail.timeToExpire / 1000);
    throw new ThrottlerException(`Too many requests. Please slow down and try again later. Retry after ${retryAfter} seconds.`);
  }
}
