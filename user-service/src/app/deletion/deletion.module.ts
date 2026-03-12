import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { DeletionController } from './deletion.controller';
import { DeletionService } from './deletion.service';
import { DeletionCronService } from './deletion-cron.service';
import { DeletionRequest, DeletionRequestSchema } from './schemas/deletion-request.schema';
import { RefreshTokenModule } from '../refresh-token/refresh-token.module';
import { User, UserSchema } from '../schemas/user.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: DeletionRequest.name, schema: DeletionRequestSchema },
      { name: User.name, schema: UserSchema },
    ]),
    RefreshTokenModule,
  ],
  controllers: [DeletionController],
  providers: [DeletionService, DeletionCronService],
  exports: [DeletionService],
})
export class DeletionModule {}
