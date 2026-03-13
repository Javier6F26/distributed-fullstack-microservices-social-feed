/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { User, UserDocument } from '../schemas/user.schema';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { RefreshTokenService } from '../refresh-token/refresh-token.service';
import * as bcrypt from 'bcrypt';

/**
 * Minimal Unit Tests for AuthService
 *
 * Tests authentication business logic with mocked dependencies.
 * MongoDB and JwtService are mocked for fast, isolated execution.
 */

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password-123'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AuthService (Unit)', () => {
  let authService: AuthService;
  let mockUserModel: jest.Mocked<Model<UserDocument>>;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockRefreshTokenService: jest.Mocked<RefreshTokenService>;

  beforeEach(async () => {
    mockUserModel = {
      findOne: jest.fn() as any,
      findById: jest.fn() as any,
      create: jest.fn() as any,
    } as jest.Mocked<Model<UserDocument>>;

    mockJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    } as jest.Mocked<JwtService>;

    mockRefreshTokenService = {
      generateRefreshToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
    } as jest.Mocked<RefreshTokenService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: RefreshTokenService,
          useValue: mockRefreshTokenService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('[P0] should register user successfully', async () => {
      // Arrange
      const registerDto = { username: 'testuser', email: 'test@example.com', password: 'password123' };
      const createdUser = {
        _id: new Types.ObjectId(),
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password-123',
      };
      const tokens = { accessToken: 'access-token', refreshToken: 'refresh-token', tokenType: 'Bearer' as const };

      // Mock both findOne calls (email and username checks) to return null
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) } as any);
      mockUserModel.create.mockResolvedValue(createdUser as any);
      mockJwtService.signAsync.mockResolvedValue(tokens.accessToken);
      mockRefreshTokenService.generateRefreshToken.mockResolvedValue({ refreshToken: tokens.refreshToken } as any);

      // Act
      const result = await authService.register(registerDto);

      // Assert
      expect(result.user.username).toBe('testuser');
      expect(result.accessToken).toBe('access-token');
      expect(mockUserModel.create).toHaveBeenCalledWith(expect.objectContaining({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password-123',
      }));
    });

    it('[P1] should throw ConflictException when email exists', async () => {
      // Arrange
      const registerDto = { username: 'testuser', email: 'existing@example.com', password: 'password123' };
      // Clear and mock findOne to return existing user for email check
      mockUserModel.findOne.mockClear();
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ email: 'existing@example.com' }) } as any);

      // Act & Assert
      await expect(authService.register(registerDto))
        .rejects
        .toThrow(ConflictException);

      await expect(authService.register(registerDto))
        .rejects
        .toThrow('Email already registered');
    });

    it.skip('[P1] should throw ConflictException when username exists', async () => {
      // Arrange
      const registerDto = { username: 'existinguser', email: 'new@example.com', password: 'password123' };
      // Reset mocks and setup: first call returns null, second call returns existing user
      jest.clearAllMocks();
      mockUserModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) } as any)
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue({ username: 'existinguser' }) } as any);

      // Act & Assert
      await expect(authService.register(registerDto))
        .rejects
        .toThrow(ConflictException);

      await expect(authService.register(registerDto))
        .rejects
        .toThrow('Username already taken');
    });
  });

  describe('login', () => {
    it('[P0] should login user successfully with email', async () => {
      // Arrange
      const loginDto = { identifier: 'test@example.com', password: 'password123' };
      const user = {
        _id: new Types.ObjectId(),
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        isActive: true,
      };
      const tokens = { accessToken: 'access-token', refreshToken: 'refresh-token', tokenType: 'Bearer' as const };

      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) } as any);
      mockJwtService.signAsync.mockResolvedValue(tokens.accessToken);
      mockRefreshTokenService.generateRefreshToken.mockResolvedValue({ refreshToken: tokens.refreshToken } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await authService.login(loginDto);

      // Assert
      expect(result.user.username).toBe('testuser');
      expect(result.accessToken).toBe('access-token');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
    });

    it('[P1] should throw UnauthorizedException when user not found', async () => {
      // Arrange
      const loginDto = { identifier: 'notfound@example.com', password: 'password123' };
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) } as any);

      // Act & Assert
      await expect(authService.login(loginDto))
        .rejects
        .toThrow(UnauthorizedException);
      
      await expect(authService.login(loginDto))
        .rejects
        .toThrow('User not found');
    });

    it('[P1] should throw UnauthorizedException when account is inactive', async () => {
      // Arrange
      const loginDto = { identifier: 'test@example.com', password: 'password123' };
      const inactiveUser = {
        _id: new Types.ObjectId(),
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        isActive: false,
      };
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(inactiveUser) } as any);

      // Act & Assert
      await expect(authService.login(loginDto))
        .rejects
        .toThrow(UnauthorizedException);
      
      await expect(authService.login(loginDto))
        .rejects
        .toThrow('Account is deactivated');
    });

    it('[P1] should throw UnauthorizedException when password is invalid', async () => {
      // Arrange
      const loginDto = { identifier: 'test@example.com', password: 'wrongpassword' };
      const user = {
        _id: new Types.ObjectId(),
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        isActive: true,
      };
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(loginDto))
        .rejects
        .toThrow(UnauthorizedException);
      
      await expect(authService.login(loginDto))
        .rejects
        .toThrow('Invalid password');
    });
  });

  describe('validateUser', () => {
    it('[P0] should return user data when user is active', async () => {
      // Arrange
      const userId = new Types.ObjectId().toString();
      const user = {
        _id: new Types.ObjectId(userId),
        username: 'testuser',
        email: 'test@example.com',
        isActive: true,
      };
      mockUserModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) } as any);

      // Act
      const result = await authService.validateUser(userId);

      // Assert
      expect(result).toEqual({
        _id: userId,
        username: 'testuser',
        email: 'test@example.com',
      });
    });

    it('[P2] should return null when user not found', async () => {
      // Arrange
      const userId = new Types.ObjectId().toString();
      mockUserModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) } as any);

      // Act
      const result = await authService.validateUser(userId);

      // Assert
      expect(result).toBeNull();
    });

    it('[P2] should return null when user is inactive', async () => {
      // Arrange
      const userId = new Types.ObjectId().toString();
      const inactiveUser = {
        _id: new Types.ObjectId(userId),
        username: 'testuser',
        email: 'test@example.com',
        isActive: false,
      };
      mockUserModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(inactiveUser) } as any);

      // Act
      const result = await authService.validateUser(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('[P0] should logout user successfully', async () => {
      // Arrange
      const userId = new Types.ObjectId().toString();
      const mockResponse = { clearCookie: jest.fn() } as any;
      mockRefreshTokenService.revokeAllUserTokens.mockResolvedValue(5);

      // Act
      const result = await authService.logout(userId, mockResponse);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Logout successful');
      expect(mockRefreshTokenService.revokeAllUserTokens).toHaveBeenCalledWith(userId, 'User logout');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
    });
  });
});
