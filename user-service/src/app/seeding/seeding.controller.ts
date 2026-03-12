import { Controller, Post, Body } from '@nestjs/common';
import { SeedingService } from './seeding.service';

@Controller('seeding')
export class SeedingController {
  constructor(private readonly seedingService: SeedingService) {}

  @Post('bulk')
  async seedUsers(@Body('count') count: number) {
    return this.seedingService.seedUsers(count);
  }
}
