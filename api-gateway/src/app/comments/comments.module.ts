import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CommentsController } from './comments.controller';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';
import { AuthModule } from '../auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    RabbitmqModule,
    AuthModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 30,
      },
    ]),
  ],
  controllers: [CommentsController],
  exports: [],
})
export class CommentsModule {}
