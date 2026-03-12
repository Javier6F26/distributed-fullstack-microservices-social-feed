import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserDocument } from '../schemas/user.schema';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    validateUser: jest.fn(),
    setRefreshTokenCookie: jest.fn(),
    clearRefreshTokenCookie: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a user and set cookie', async () => {
      // Arrange
      const registerDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePass123!',
      };
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        cookie: jest.fn(),
      } as any;

      mockAuthService.register.mockResolvedValue({
        message: 'Registration successful',
        user: { _id: 'id', username: 'testuser', email: 'test@example.com' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        expiresIn: 900,
      });

      // Act
      await authController.register(registerDto, mockResponse);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Registration successful',
          accessToken: 'access-token',
        }),
      );
    });
  });

  describe('login', () => {
    it('should successfully login and set cookie', async () => {
      // Arrange
      const loginDto = {
        identifier: 'test@example.com',
        password: 'SecurePass123!',
      };
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        header: jest.fn(),
      } as any;
      const mockRequest = {
        ip: '192.168.1.1',
        socket: { remoteAddress: '192.168.1.1' },
      } as any;

      mockAuthService.login.mockResolvedValue({
        message: 'Login successful',
        user: { _id: 'id', username: 'testuser', email: 'test@example.com' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        expiresIn: 900,
      });

      // Act
      await authController.login(loginDto, mockResponse, mockRequest);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(loginDto, '192.168.1.1');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should pass client IP to authService for audit logging', async () => {
      // Arrange
      const loginDto = {
        identifier: 'test@example.com',
        password: 'SecurePass123!',
      };
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const mockRequest = {
        ip: '10.0.0.1',
        socket: { remoteAddress: '10.0.0.1' },
      } as any;

      mockAuthService.login.mockResolvedValue({
        message: 'Login successful',
        user: { _id: 'id', username: 'testuser', email: 'test@example.com' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      // Act
      await authController.login(loginDto, mockResponse, mockRequest);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(loginDto, '10.0.0.1');
    });

    it('should handle missing IP gracefully', async () => {
      // Arrange
      const loginDto = {
        identifier: 'test@example.com',
        password: 'SecurePass123!',
      };
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const mockRequest = {
        ip: undefined,
        socket: { remoteAddress: undefined },
      } as any;

      mockAuthService.login.mockResolvedValue({
        message: 'Login successful',
        user: { _id: 'id', username: 'testuser', email: 'test@example.com' },
        accessToken: 'access-token',
      });

      // Act
      await authController.login(loginDto, mockResponse, mockRequest);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(loginDto, undefined);
    });
  });

  describe('refresh', () => {
    it('should return 401 if refresh token not found', async () => {
      // Arrange
      const mockRequest = {
        cookies: {},
      } as any;
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      // Act
      await authController.refresh(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Refresh token not found',
      });
    });

    it('should refresh token successfully', async () => {
      // Arrange
      const mockRequest = {
        cookies: {
          refreshToken: 'valid-refresh-token',
        },
      } as any;
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        header: jest.fn(),
      } as any;

      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        tokenType: 'Bearer',
        expiresIn: 900,
      });

      // Act
      await authController.refresh(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'new-access-token',
        }),
      );
    });
  });

  describe('logout', () => {
    it('should clear refresh token cookie', async () => {
      // Arrange
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        clearCookie: jest.fn(),
      } as any;

      // Act
      await authController.logout(mockResponse);

      // Assert
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful',
      });
    });
  });
});
