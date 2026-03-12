import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserDocument } from '../schemas/user.schema';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

describe('AuthService', () => {
  let authService: AuthService;
  let userModel: Model<UserDocument>;
  let jwtService: JwtService;

  const mockUser = {
    _id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    isActive: true,
    failedLoginAttempts: 0,
    lastFailedLoginAt: null,
    lastLoginAt: null,
    lastLoginIp: null,
    save: jest.fn(),
  };

  const mockUserModel = {
    findOne: jest.fn().mockReturnValue({
      exec: jest.fn(),
    }),
    create: jest.fn(),
    findById: jest.fn().mockReturnValue({
      exec: jest.fn(),
    }),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
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
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterUserDto = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'SecurePass123!',
    };

    it('should successfully register a new user', async () => {
      // Arrange
      mockUserModel.findOne.mockResolvedValue(null); // No existing user
      mockUserModel.create.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('mock-token');

      // Act
      const result = await authService.register(registerDto);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledTimes(2); // Check email and username
      expect(userModel.create).toHaveBeenCalledWith({
        username: registerDto.username,
        email: registerDto.email,
        passwordHash: expect.any(String),
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(result.user.username).toBe(mockUser.username);
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      mockUserModel.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.register(registerDto)).rejects.toThrow('Email already registered');
    });

    it('should throw ConflictException if username already exists', async () => {
      // Arrange
      mockUserModel.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockUser);

      // Act & Assert
      await expect(authService.register(registerDto)).rejects.toThrow('Username already taken');
    });

    it('should hash password with bcrypt before saving', async () => {
      // Arrange
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('mock-token');

      // Act
      await authService.register(registerDto);

      // Assert
      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: expect.any(String),
        }),
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginUserDto = {
      identifier: 'test@example.com',
      password: 'SecurePass123!',
    };

    it('should successfully login with valid credentials', async () => {
      // Arrange
      mockUserModel.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockJwtService.signAsync.mockResolvedValue('mock-token');

      // Act
      const result = await authService.login(loginDto, '192.168.1.1');

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({
        $or: [
          { email: loginDto.identifier },
          { username: loginDto.identifier },
        ],
      });
      expect(result).toHaveProperty('accessToken');
      expect(result.message).toBe('Login successful');
      expect(mockUser.save).toHaveBeenCalled(); // Should log successful login
    });

    it('should throw UnauthorizedException with specific message if user not found', async () => {
      // Arrange
      mockUserModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(loginDto)).rejects.toThrow('User not found');
    });

    it('should throw UnauthorizedException with specific message if password is invalid', async () => {
      // Arrange
      mockUserModel.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      // Act & Assert
      await expect(authService.login(loginDto)).rejects.toThrow('Invalid password');
      expect(mockUser.save).toHaveBeenCalled(); // Should increment failed attempts
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserModel.findOne.mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(authService.login(loginDto)).rejects.toThrow('Account is deactivated');
    });

    it('should throw UnauthorizedException if account is locked due to too many failed attempts', async () => {
      // Arrange
      const lockedUser = {
        ...mockUser,
        failedLoginAttempts: 5,
        lastFailedLoginAt: new Date(),
      };
      mockUserModel.findOne.mockResolvedValue(lockedUser);

      // Act & Assert
      await expect(authService.login(loginDto)).rejects.toThrow('Account locked due to too many failed attempts');
    });

    it('should reset failed attempts after lockout period expires', async () => {
      // Arrange
      const fifteenMinutesAgo = new Date(Date.now() - 16 * 60 * 1000); // 16 minutes ago
      const lockedUser = {
        ...mockUser,
        failedLoginAttempts: 5,
        lastFailedLoginAt: fifteenMinutesAgo,
      };
      mockUserModel.findOne.mockResolvedValue(lockedUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockJwtService.signAsync.mockResolvedValue('mock-token');

      // Act
      const result = await authService.login(loginDto);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(lockedUser.failedLoginAttempts).toBe(0); // Should be reset
    });

    it('should increment failed login attempts on invalid password', async () => {
      // Arrange
      const userWithAttempts = {
        ...mockUser,
        failedLoginAttempts: 2,
      };
      mockUserModel.findOne.mockResolvedValue(userWithAttempts);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      // Act & Assert
      await expect(authService.login(loginDto)).rejects.toThrow('Invalid password');
      expect(userWithAttempts.failedLoginAttempts).toBe(3); // Should be incremented
      expect(userWithAttempts.lastFailedLoginAt).toBeDefined();
    });
  });

  describe('refreshToken', () => {
    it('should generate new tokens with valid refresh token', async () => {
      // Arrange
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockJwtService.verifyAsync.mockResolvedValue({ sub: mockUser._id });
      mockJwtService.signAsync.mockResolvedValue('new-token');

      // Act
      const result = await authService.refreshToken(mockUser._id, 'valid-refresh-token');

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      mockUserModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.refreshToken('invalid-id', 'token')).rejects.toThrow('User not found');
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      // Arrange
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expect(authService.refreshToken(mockUser._id, 'invalid-token')).rejects.toThrow('Invalid or expired refresh token');
    });
  });

  describe('validateUser', () => {
    it('should return user data without password if user is active', async () => {
      // Arrange
      mockUserModel.findById.mockResolvedValue(mockUser);

      // Act
      const result = await authService.validateUser(mockUser._id);

      // Assert
      expect(result).toEqual({
        _id: mockUser._id,
        username: mockUser.username,
        email: mockUser.email,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null if user not found', async () => {
      // Arrange
      mockUserModel.findById.mockResolvedValue(null);

      // Act
      const result = await authService.validateUser('invalid-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null if user is inactive', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserModel.findById.mockResolvedValue(inactiveUser);

      // Act
      const result = await authService.validateUser(mockUser._id);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('setRefreshTokenCookie', () => {
    it('should set HttpOnly secure cookie in production', () => {
      // Arrange
      const mockResponse = {
        cookie: jest.fn(),
      } as any;
      process.env.NODE_ENV = 'production';

      // Act
      authService.setRefreshTokenCookie(mockResponse, 'test-refresh-token');

      // Assert
      expect(mockResponse.cookie).toHaveBeenCalledWith('refreshToken', 'test-refresh-token', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });
    });

    it('should set secure to false in development', () => {
      // Arrange
      const mockResponse = {
        cookie: jest.fn(),
      } as any;
      process.env.NODE_ENV = 'development';

      // Act
      authService.setRefreshTokenCookie(mockResponse, 'test-refresh-token');

      // Assert
      expect(mockResponse.cookie).toHaveBeenCalledWith('refreshToken', 'test-refresh-token', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });
    });
  });
});
