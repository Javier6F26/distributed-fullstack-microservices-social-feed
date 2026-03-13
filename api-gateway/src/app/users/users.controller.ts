import { Controller, Get, Post, Body, Logger, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  private getUserServiceUrl(): string {
    return this.configService.get<string>('USER_SERVICE_URL') || 'http://localhost:3001';
  }

  /**
   * POST /users/bulk
   * Bulk create users via User Service.
   * Development/seeding endpoint - should be protected in production.
   */
  @Post('bulk')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for bulk operations
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk create users (for seeding/development)' })
  @ApiBody({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          username: { type: 'string', example: 'johndoe' },
          email: { type: 'string', example: 'john@example.com' },
          password: { type: 'string', example: 'Password123!' },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Users created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async bulkCreateUsers(@Body() users: any[]) {
    const userServiceUrl = this.getUserServiceUrl();

    this.logger.log(`📥 Bulk create users request: ${users.length} users`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${userServiceUrl}/users/bulk`, users, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`✅ Bulk create users response: ${response.data.summary?.created || 0} created`);
      return response.data;
    } catch (error: any) {
      this.logger.error('❌ Bulk create users error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Bulk user creation service temporarily unavailable',
        status: HttpStatus.SERVICE_UNAVAILABLE,
      };
    }
  }

  /**
   * GET /users/me
   * Get current user profile
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() request: any) {
    const userServiceUrl = this.getUserServiceUrl();
    const userId = request.user?.sub || request.user?.userId;

    const result = await firstValueFrom(
      this.httpService.get(`${userServiceUrl}/users/${userId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );

    return result.data;
  }
}
