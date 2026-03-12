import { Controller, Post, Body, Res, Req, UseGuards, Delete } from '@nestjs/common';
import type { Response, Request } from 'express';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    ) {}

  private getUserServiceUrl(): string {
    return this.configService.get<string>('USER_SERVICE_URL') || 'http://localhost:3001';
  }

  /**
   * POST /auth/register
   * Proxy registration request to user-service
   * Rate limit: 5 requests per minute (stricter for registration)
   */
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per 60 seconds
  async register(@Body() registerUserDto: any, @Res() response: Response) {
    try {
      const userServiceUrl = this.getUserServiceUrl();
      const result = await firstValueFrom(
        this.httpService.post(`${userServiceUrl}/auth/register`, registerUserDto, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      // Forward the response from user-service
      return response.status(result.status).json(result.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Registration failed';
      return response.status(status).json({
        success: false,
        message,
      });
    }
  }

  /**
   * POST /auth/login
   * Proxy login request to user-service
   * Rate limit: 10 requests per minute (prevent brute force)
   */
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per 60 seconds
  async login(@Body() loginUserDto: any, @Res() response: Response) {
    try {
      const userServiceUrl = this.getUserServiceUrl();
      const result = await firstValueFrom(
        this.httpService.post(`${userServiceUrl}/auth/login`, loginUserDto, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      // Forward cookies from user-service response
      const cookies = result.headers['set-cookie'];
      if (cookies) {
        cookies.forEach((cookie: string) => {
          response.header('Set-Cookie', cookie);
        });
      }

      return response.status(result.status).json(result.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Login failed';
      return response.status(status).json({
        success: false,
        message,
      });
    }
  }

  /**
   * POST /auth/refresh
   * Proxy refresh token request to user-service
   * Rate limit: 30 requests per minute (prevent abuse)
   */
  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60 } })
  async refresh(@Req() request: Request, @Res() response: Response) {
    try {
      const userServiceUrl = this.getUserServiceUrl();
      const refreshToken = request.cookies?.refreshToken;

      if (!refreshToken) {
        return response.status(401).json({
          success: false,
          message: 'Refresh token not found',
        });
      }

      const result = await firstValueFrom(
        this.httpService.post(`${userServiceUrl}/auth/refresh`, {}, {
          headers: {
            'Content-Type': 'application/json',
            Cookie: `refreshToken=${refreshToken}`,
          },
        }),
      );

      // Forward cookies from user-service response
      const cookies = result.headers['set-cookie'];
      if (cookies) {
        cookies.forEach((cookie: string) => {
          response.header('Set-Cookie', cookie);
        });
      }

      return response.status(result.status).json(result.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Token refresh failed';
      return response.status(status).json({
        success: false,
        message,
      });
    }
  }

  /**
   * POST /auth/logout
   * Proxy logout request to user-service
   * Rate limit: 10 requests per minute (prevent abuse)
   */
  @Post('logout')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  async logout(@Req() request: Request, @Res() response: Response) {
    try {
      const userServiceUrl = this.getUserServiceUrl();
      const refreshToken = request.cookies?.refreshToken;
      const authHeader = request.headers.authorization;

      const result = await firstValueFrom(
        this.httpService.post(`${userServiceUrl}/auth/logout`, {}, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
            Cookie: refreshToken ? `refreshToken=${refreshToken}` : '',
          },
        }),
      );

      // Clear cookie with same attributes as set
      response.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      return response.status(result.status).json(result.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Logout failed';
      return response.status(status).json({
        success: false,
        message,
      });
    }
  }

  /**
   * DELETE /account
   * Proxy account deletion request to user-service
   * Rate limit: 5 requests per day (prevent abuse)
   */
  @Delete('account')
  @Throttle({ default: { limit: 5, ttl: 86400 } })
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@Req() request: Request, @Res() response: Response) {
    try {
      const userServiceUrl = this.getUserServiceUrl();
      const refreshToken = request.cookies?.refreshToken;
      const authHeader = request.headers.authorization;

      const result = await firstValueFrom(
        this.httpService.delete(`${userServiceUrl}/deletion/request`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
            Cookie: refreshToken ? `refreshToken=${refreshToken}` : '',
          },
        }),
      );

      // Clear cookie on successful deletion request
      response.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      return response.status(result.status).json(result.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Deletion request failed';
      return response.status(status).json({
        success: false,
        message,
      });
    }
  }
}
