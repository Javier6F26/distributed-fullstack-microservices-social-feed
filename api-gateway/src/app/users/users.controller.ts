import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  private getUserServiceUrl(): string {
    return this.configService.get<string>('USER_SERVICE_URL') || 'http://localhost:3001';
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
