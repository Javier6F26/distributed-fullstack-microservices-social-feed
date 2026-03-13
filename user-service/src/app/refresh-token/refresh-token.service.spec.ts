import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let jwtService: JwtService;

  const mockUserId = new Types.ObjectId();
  const mockRefreshToken = 'mock-refresh-token';
  const mockTokenHash = 'hashed-token';

  const mockRefreshTokenDoc = {
    _id: new Types.ObjectId(),
    userId: mockUserId,
    tokenHash: mockTokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    revoked: false,
    revokedAt: null,
    replacedByTokenHash: null,
    reason: null,
    lastUsedIp: null,
    save: jest.fn(),
  } as unknown as RefreshTokenDocument;

  const mockRefreshTokenModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: getModelToken(RefreshToken.name),
          useValue: mockRefreshTokenModel,
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
              if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
    refreshTokenModel = module.get<Model<RefreshTokenDocument>>(getModelToken(RefreshToken.name));
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token and store metadata', async () => {
      const mockToken = 'generated-refresh-token';
      const mockHash = 'hashed-token';

      jest.spyOn(service as any, 'hashToken').mockReturnValue(mockHash);
      (jwtService.signAsync as jest.Mock).mockResolvedValue(mockToken);
      (mockRefreshTokenModel.create as jest.Mock).mockResolvedValue(mockRefreshTokenDoc);

      const result = await service.generateRefreshToken(mockUserId, '192.168.1.1');

      expect(result).toEqual({
        refreshToken: mockToken,
        tokenHash: mockHash,
        expiresAt: expect.any(Date),
      });
      expect(mockRefreshTokenModel.create).toHaveBeenCalledWith({
        userId: mockUserId,
        tokenHash: mockHash,
        expiresAt: expect.any(Date),
        lastUsedIp: '192.168.1.1',
      });
    });
  });

  describe('validateRefreshToken', () => {
    it('should return valid token metadata for valid refresh token', async () => {
      const mockStoredToken = {
        ...mockRefreshTokenDoc,
        user: { _id: mockUserId },
      };

      (mockRefreshTokenModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockStoredToken),
      });
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: mockUserId.toString() });

      const result = await service.validateRefreshToken(mockRefreshToken, '192.168.1.1');

      expect(result).toEqual({
        isValid: true,
        userId: mockUserId,
        token: mockStoredToken,
      });
    });

    it('should return invalid for expired refresh token', async () => {
      const expiredToken = {
        ...mockRefreshTokenDoc,
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      (mockRefreshTokenModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(expiredToken),
      });

      const result = await service.validateRefreshToken(mockRefreshToken, '192.168.1.1');

      expect(result).toEqual({
        isValid: false,
        userId: null,
        token: null,
        reason: 'Token expired',
      });
    });

    it('should return invalid for revoked refresh token', async () => {
      const revokedToken = {
        ...mockRefreshTokenDoc,
        revoked: true,
        revokedAt: new Date(),
      };

      (mockRefreshTokenModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(revokedToken),
      });

      const result = await service.validateRefreshToken(mockRefreshToken, '192.168.1.1');

      expect(result).toEqual({
        isValid: false,
        userId: null,
        token: null,
        reason: 'Token revoked',
      });
    });

    it('should return invalid for non-existent token', async () => {
      (mockRefreshTokenModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.validateRefreshToken(mockRefreshToken, '192.168.1.1');

      expect(result).toEqual({
        isValid: false,
        userId: null,
        token: null,
        reason: 'Token not found',
      });
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke a refresh token', async () => {
      const mockToken = { ...mockRefreshTokenDoc, save: jest.fn().mockResolvedValue(undefined) };

      const result = await service.revokeRefreshToken(mockToken, 'User logout');

      expect(result.revoked).toBe(true);
      expect(result.revokedAt).toBeDefined();
      expect(result.reason).toBe('User logout');
    });
  });

  describe('rotateRefreshToken', () => {
    it('should revoke old token and create new one', async () => {
      const mockOldToken = { ...mockRefreshTokenDoc, save: jest.fn().mockResolvedValue(undefined) };

      jest.spyOn(service, 'generateRefreshToken').mockResolvedValue({
        refreshToken: 'new-token',
        tokenHash: 'new-hash',
        expiresAt: new Date(),
      });

      const result = await service.rotateRefreshToken(mockOldToken, '192.168.1.1');

      expect(mockOldToken.save).toHaveBeenCalled();
      expect(result).toEqual({
        refreshToken: 'new-token',
        tokenHash: 'new-hash',
        expiresAt: expect.any(Date),
      });
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      (mockRefreshTokenModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 5 });

      const result = await service.cleanupExpiredTokens();

      expect(result).toBe(5);
      expect(mockRefreshTokenModel.deleteMany).toHaveBeenCalledWith({
        expiresAt: { $lt: expect.any(Date) },
      });
    });
  });
});
