import { Controller, Post, Req, Res, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { RefreshTokenService } from './refresh-token.service';

@Controller('refresh-token')
export class RefreshTokenController {
  private readonly logger = new Logger(RefreshTokenController.name);

  constructor(
    private refreshTokenService: RefreshTokenService,
  ) {}

  /**
   * POST /refresh-token/revoke
   * Revoke refresh token (logout)
   */
  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  async revoke(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = request.cookies?.refreshToken;

    if (!refreshToken) {
      return response.status(HttpStatus.OK).json({
        success: true,
        message: 'Already logged out',
      });
    }

    try {
      const validation = await this.refreshTokenService.validateRefreshToken(refreshToken);

      if (validation.isValid && validation.token) {
        await this.refreshTokenService.revokeRefreshToken(validation.token, 'User logout');
      }
    } catch (error) {
      // Ignore errors - just clear the cookie
    }

    return response.status(HttpStatus.OK).json({
      success: true,
      message: 'Logout successful',
    });
  }
}
