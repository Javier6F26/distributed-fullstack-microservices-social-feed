import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommentsModule } from './comments/comments.module';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import { CommentsSyncModule } from './comments-sync/comments-sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/comments',
      }),
      inject: [ConfigService],
    }),
    CommentsModule,
    RabbitmqModule,
    CommentsSyncModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
