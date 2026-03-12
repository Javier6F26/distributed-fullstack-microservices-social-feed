import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller()
export class AppController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get('health')
  healthCheck() {
    const isDbConnected = this.connection.readyState === 1;
    if (isDbConnected) {
      return { status: 'ok', database: 'connected' };
    }
    return { status: 'error', database: 'disconnected' };
  }
}
