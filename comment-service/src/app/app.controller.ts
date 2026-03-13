import { Controller, Get, Post } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CommentsSyncService } from './comments-sync/comments-sync.service';

@Controller()
export class AppController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly commentsSyncService: CommentsSyncService,
  ) {}

  @Get('health')
  healthCheck() {
    const isDbConnected = this.connection.readyState === 1;
    if (isDbConnected) {
      return { status: 'ok', database: 'connected' };
    }
    return { status: 'error', database: 'disconnected' };
  }

  @Post('sync/force')
  async forceSync() {
    await this.commentsSyncService.forceSyncAllPosts();
    return { status: 'ok', message: 'Force sync completed' };
  }

  @Get('sync/status')
  async syncStatus() {
    const trackers = await this.connection.collection('post_sync_trackers').countDocuments();
    const postsWithComments = await this.connection.collection('comments').distinct('postId');
    return {
      status: 'ok',
      syncTrackers: trackers,
      postsWithComments: postsWithComments.length,
    };
  }
}
