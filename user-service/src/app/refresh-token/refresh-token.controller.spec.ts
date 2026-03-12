import { Test, TestingModule } from '@nestjs/testing';
import { RefreshTokenController } from './refresh-token.controller';
import { RefreshTokenService } from './refresh-token.service';
import { AuthService } from '../auth/auth.service';
import { Request, Response } from 'express';

describe('RefreshTokenController', () => {
  let controller: RefreshTokenController;
  let refreshTokenService: Partial<RefreshTokenService>;
  let authService: Partial<AuthService>;

  const mockRequest: Partial<Request> = {
    ip: '192.168.1.1',
    socket: { remoteAddress: '192.168.1.1' },
    cookies: {
      refreshToken: 'valid-refresh-token',
    },
  };

  const mockResponse: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    clearCookie: jest.fn(),
    cookie: jest.fn(),
  };

  beforeEach(async () => {
    refreshTokenService = {
      validateRefreshToken: jest.fn(),
      rotateRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
    };

    authService = {
      clearRefreshTokenCookie: jest.fn(),
      setRefreshTokenCookie: jest.fn(),
      jwtService: {
        signAsync: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefreshTokenController],
      providers: [
        {
          provide: RefreshTokenService,
          useValue: refreshTokenService,
        },
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<RefreshTokenController>(RefreshTokenController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('refresh', () => {
    it('should return 401 if refresh token not found', async () => {
      mockRequest.cookies = {};

      await controller.refresh(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Refresh token not found',
      });
    });

    it('should return 401 if refresh token is invalid', async () => {
      (refreshTokenService.validateRefreshToken as jest.Mock).mockResolvedValue({
        isValid: false,
        userId: null,
        token: null,
        reason: 'Token expired',
      });

      await controller.refresh(mockRequest as Request, mockResponse as Response);

      expect(authService.clearRefreshTokenCookie).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Invalid or expired'),
        }),
      );
    });

    it('should return new tokens if refresh token is valid', async () => {
      const mockUserId = { _id: 'user-id' };
      const mockToken = { _id: 'token-id', userId: mockUserId };
      const mockNewTokens = {
        refreshToken: 'new-refresh-token',
        tokenHash: 'new-hash',
        expiresAt: new Date(),
      };

      (refreshTokenService.validateRefreshToken as jest.Mock).mockResolvedValue({
        isValid: true,
        userId: mockUserId,
        token: mockToken,
      });

      (refreshTokenService.rotateRefreshToken as jest.Mock).mockResolvedValue(mockNewTokens);
      (authService.jwtService.signAsync as jest.Mock).mockResolvedValue('new-access-token');

      await controller.refresh(mockRequest as Request, mockResponse as Response);

      expect(authService.setRefreshTokenCookie).toHaveBeenCalledWith(
        mockResponse,
        mockNewTokens.refreshToken,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        accessToken: 'new-access-token',
        tokenType: 'Bearer',
        expiresIn: expect.any(Number),
      });
    });
  });

  describe('revoke', () => {
    it('should revoke valid refresh token', async () => {
      (refreshTokenService.validateRefreshToken as jest.Mock).mockResolvedValue({
        isValid: true,
        userId: { _id: 'user-id' },
        token: { _id: 'token-id' },
      });

      await controller.revoke(mockRequest as Request, mockResponse as Response);

      expect(refreshTokenService.revokeRefreshToken).toHaveBeenCalled();
      expect(authService.clearRefreshTokenCookie).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful',
      });
    });

    it('should return success even if token not found', async () => {
      mockRequest.cookies = {};

      await controller.revoke(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Already logged out',
      });
    });
  });
});
