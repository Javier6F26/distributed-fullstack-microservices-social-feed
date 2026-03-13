import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { BulkCreateUsersDto } from './dto/bulk-create-users.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('users-bulk')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private usersService: UsersService) {}

  /**
   * GET /users/profile
   * Get current user profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() request: Request) {
    const userId = (request.user as Record<string, unknown>)?.sub as string;
    return this.usersService.getProfile(userId);
  }

  /**
   * GET /users/:id
   * Get user by ID (for internal service calls)
   */
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  /**
   * POST /users/bulk
   * Bulk create users with strict schema validation.
   * Development/seeding endpoint - should be protected in production.
   *
   * @param bulkCreateUsersDto - Array of users to create
   * @returns Object with created, skipped, and error counts
   */
  @Post('bulk')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  @ApiOperation({ summary: 'Bulk create users (for seeding/development)' })
  @ApiResponse({ status: 201, description: 'Users created successfully' })
  async bulkCreateUsers(@Body() bulkCreateUsersDto: BulkCreateUsersDto) {
    this.logger.log(
      `📥 Bulk create request: ${bulkCreateUsersDto.users.length} users`,
    );

    const result = await this.usersService.bulkCreateUsers(
      bulkCreateUsersDto.users,
    );

    this.logger.log(
      `✅ Bulk create complete: ${result.created.length} created, ${result.skipped.length} skipped, ${result.errors.length} errors`,
    );

    return {
      success: true,
      message: 'Bulk user creation complete',
      summary: {
        total: bulkCreateUsersDto.users.length,
        created: result.created.length,
        skipped: result.skipped.length,
        errors: result.errors.length,
      },
      details: result,
    };
  }
}
