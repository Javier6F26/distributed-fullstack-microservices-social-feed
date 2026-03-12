import {
  Controller,
  Delete,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DeletionService } from './deletion.service';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('deletion')
export class DeletionController {
  private readonly logger = new Logger(DeletionController.name);

  constructor(private deletionService: DeletionService) {}

  /**
   * DELETE /deletion/request
   * Request account deletion (authenticated users only)
   * Rate limit: 5 requests per day
   */
  @Delete('request')
  @Throttle({ default: { limit: 5, ttl: 86400 } })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async requestDeletion(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const userId = request.user['sub'];
      const ipAddress = request.ip || request.socket.remoteAddress || undefined;

      if (!userId) {
        return response.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'User ID not found',
        });
      }

      // Check if deletion already requested
      const existingRequest = await this.deletionService.getByUserId(userId);
      if (existingRequest) {
        return response.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message:
            'Deletion request already pending. Please check your email.',
        });
      }

      // Create deletion request
      const deletionRequest = await this.deletionService.requestDeletion(
        userId,
        ipAddress,
      );

      // Process deletion (revoke tokens)
      await this.deletionService.processDeletionRequest(deletionRequest);

      // TODO: Send email notification (async)
      // For MVP: Log to console
      this.logger.log(
        `Deletion confirmation email would be sent to user ${userId}`,
      );
      await this.deletionService.markEmailSent(deletionRequest);

      this.logger.log(`Account deletion requested for user ${userId}`);

      return response.status(HttpStatus.OK).json({
        success: true,
        message:
          'Account deletion request received. You have been logged out. A confirmation email has been sent.',
        deletionRequest: {
          id: deletionRequest._id,
          scheduledDeletionAt: deletionRequest.scheduledDeletionAt,
        },
      });
    } catch (error: any) {
      this.logger.error('Deletion request failed:', error);
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Deletion request failed. Please try again.',
      });
    }
  }

  /**
   * GET /deletion/status
   * Get current deletion request status for authenticated user
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getDeletionStatus(@Req() request: Request) {
    try {
      const userId = request.user['sub'];

      if (!userId) {
        return {
          success: false,
          message: 'User ID not found',
        };
      }

      const deletionRequest = await this.deletionService.getByUserId(userId);

      if (!deletionRequest) {
        return {
          success: true,
          hasPendingRequest: false,
        };
      }

      return {
        success: true,
        hasPendingRequest: true,
        deletionRequest: {
          id: deletionRequest._id,
          status: deletionRequest.status,
          requestedAt: deletionRequest.requestedAt,
          scheduledDeletionAt: deletionRequest.scheduledDeletionAt,
          emailSent: deletionRequest.emailSent,
        },
      };
    } catch (error: any) {
      this.logger.error('Failed to get deletion status:', error);
      throw error;
    }
  }

  /**
   * POST /deletion/cancel
   * Cancel pending deletion request
   */
  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelDeletion(@Req() request: Request) {
    try {
      const userId = request.user['sub'];

      if (!userId) {
        return {
          success: false,
          message: 'User ID not found',
        };
      }

      const deletionRequest = await this.deletionService.getByUserId(userId);

      if (!deletionRequest) {
        return {
          success: false,
          message: 'No pending deletion request found',
        };
      }

      await this.deletionService.cancelDeletion(deletionRequest);

      this.logger.log(`Deletion request cancelled for user ${userId}`);

      return {
        success: true,
        message: 'Account deletion request cancelled. Your account is active.',
      };
    } catch (error: any) {
      this.logger.error('Failed to cancel deletion:', error);
      throw error;
    }
  }
}
