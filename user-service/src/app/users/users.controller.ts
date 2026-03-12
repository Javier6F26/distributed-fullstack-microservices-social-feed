import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  /**
   * GET /users/profile
   * Get current user profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Param('userId') userId: string) {
    return this.usersService.getProfile(userId);
  }

  /**
   * DELETE /users/:id
   * Delete user account (hard delete - for admin use only)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@Param('id') id: string) {
    await this.usersService.deleteAccount(id);
    return { message: 'Account deleted successfully' };
  }

  /**
   * DELETE /account
   * Request account deletion (soft delete with 72-hour window)
   * Rate limit: 5 requests per day
   */
  @Delete('account')
  @Throttle({ default: { limit: 5, ttl: 86400 } })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async requestAccountDeletion(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // This will be handled by the DeletionController
    // This endpoint is kept for backwards compatibility
    return response.status(HttpStatus.OK).json({
      success: true,
      message: 'Please use /deletion/request endpoint for account deletion',
    });
  }
}
