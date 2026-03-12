import { Controller, Post, Body, Res, UseGuards, Req, HttpCode, HttpStatus, Inject, forwardRef, UseInterceptors, ApplyDecorators } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { RefreshTokenService } from '../refresh-token/refresh-token.service';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @Inject(forwardRef(() => RefreshTokenService))
    private refreshTokenService: RefreshTokenService,
  ) {}

  /**
   * POST /auth/register
   * Register a new user
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerUserDto: RegisterUserDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.register(registerUserDto);

    // Set refresh token as HttpOnly cookie
    this.authService.setRefreshTokenCookie(response, result.refreshToken);

    // Remove refreshToken from response body and return plain object (let NestJS handle serialization)
    const { refreshToken, ...responseData } = result;

    return responseData;
  }

  /**
   * POST /auth/login
   * Login user
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginUserDto: LoginUserDto, @Res({ passthrough: true }) response: Response, @Req() request: Request) {
    const clientIp = request.ip || request.socket.remoteAddress || undefined;
    const result = await this.authService.login(loginUserDto, clientIp);

    // Set refresh token as HttpOnly cookie
    this.authService.setRefreshTokenCookie(response, result.refreshToken);

    // Remove refreshToken from response body and return plain object (let NestJS handle serialization)
    const { refreshToken, ...responseData } = result;

    return responseData;
  }

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token cookie
   * Rate limit: 30 requests per minute (prevent abuse)
   * Uses endpoint-specific throttler to override global defaults
   */
  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60 } })
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const clientIp = request.ip || request.socket.remoteAddress || undefined;
    const refreshToken = request.cookies?.refreshToken;

    if (!refreshToken) {
      return {
        success: false,
        message: 'Refresh token not found',
      };
    }

    try {
      // Validate refresh token using RefreshTokenService
      const validation = await this.refreshTokenService.validateRefreshToken(refreshToken, clientIp);

      if (!validation.isValid) {
        this.authService.clearRefreshTokenCookie(response);
        return {
          success: false,
          message: 'Invalid or expired refresh token',
        };
      }

      // Rotate refresh token and generate new access token
      const userId = validation.userId._id || validation.userId;
      const newTokens = await this.refreshTokenService.rotateRefreshToken(validation.token, clientIp);

      // Generate new access token
      const accessToken = await this.authService.generateAccessToken(userId);

      // Set new refresh token as HttpOnly cookie
      this.authService.setRefreshTokenCookie(response, newTokens.refreshToken);

      return {
        success: true,
        accessToken,
        tokenType: 'Bearer',
        expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '15m') * 60,
      };
    } catch (error: any) {
      this.authService.clearRefreshTokenCookie(response);
      return {
        success: false,
        message: 'Token refresh failed',
      };
    }
  }

  /**
   * POST /auth/logout
   * Logout user by revoking all tokens and clearing cookie
   * Rate limit: 10 requests per minute (prevent abuse)
   */
  @Post('logout')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      // Get user ID from JWT payload (added by JwtAuthGuard)
      const userId = request.user['sub'];

      if (!userId) {
        return {
          success: false,
          message: 'User ID not found',
        };
      }

      // Logout user (revoke all tokens and clear cookie)
      await this.authService.logout(userId, response);

      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error: any) {
      this.authService.clearRefreshTokenCookie(response);
      return {
        success: false,
        message: 'Logout failed',
      };
    }
  }
}
