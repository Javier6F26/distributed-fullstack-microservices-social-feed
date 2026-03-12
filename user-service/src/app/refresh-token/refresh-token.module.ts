import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { RefreshTokenController } from './refresh-token.controller';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshTokenCleanupService } from './refresh-token-cleanup.service';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: RefreshToken.name, schema: RefreshTokenSchema }]),
    JwtModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [RefreshTokenController],
  providers: [RefreshTokenService, RefreshTokenCleanupService],
  exports: [RefreshTokenService],
})
export class RefreshTokenModule {}
