/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AuthService } from './auth.service';
import { of, throwError } from 'rxjs';

/**
 * Minimal Unit Tests for AuthService (API Gateway)
 * 
 * Tests token validation with mocked HTTP service.
 */

describe('AuthService (Unit)', () => {
  let authService: AuthService;
  let mockHttpService: jest.Mocked<HttpService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      head: jest.fn(),
      request: jest.fn(),
    } as jest.Mocked<HttpService>;

    mockConfigService = {
      get: jest.fn(),
    } as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('validateToken', () => {
    it('[P0] should return user data when token is valid', async () => {
      // Arrange
      const accessToken = 'valid-token-123';
      const mockUserData = { _id: '123', username: 'testuser', email: 'test@example.com' };
      mockConfigService.get.mockReturnValue('http://localhost:3001');
      mockHttpService.get.mockReturnValue(of({ data: mockUserData }) as any);

      // Act
      const result = await authService.validateToken(accessToken);

      // Assert
      expect(result).toEqual(mockUserData);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'http://localhost:3001/auth/validate',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer valid-token-123',
          },
        }),
      );
    });

    it('[P1] should return null when token is invalid', async () => {
      // Arrange
      const accessToken = 'invalid-token';
      mockConfigService.get.mockReturnValue('http://localhost:3001');
      mockHttpService.get.mockReturnValue(throwError(() => new Error('Unauthorized')) as any);

      // Act
      const result = await authService.validateToken(accessToken);

      // Assert
      expect(result).toBeNull();
      expect(mockHttpService.get).toHaveBeenCalled();
    });

    it('[P1] should return null when user-service is unavailable', async () => {
      // Arrange
      const accessToken = 'valid-token';
      mockConfigService.get.mockReturnValue('http://localhost:3001');
      mockHttpService.get.mockReturnValue(throwError(() => new Error('Connection refused')) as any);

      // Act
      const result = await authService.validateToken(accessToken);

      // Assert
      expect(result).toBeNull();
    });

    it('[P2] should use default URL when USER_SERVICE_URL is not configured', async () => {
      // Arrange
      const accessToken = 'valid-token';
      const mockUserData = { _id: '123', username: 'testuser' };
      mockConfigService.get.mockReturnValue(undefined);
      mockHttpService.get.mockReturnValue(of({ data: mockUserData }) as any);

      // Act
      const result = await authService.validateToken(accessToken);

      // Assert
      expect(result).toEqual(mockUserData);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'http://localhost:3001/auth/validate',
        expect.any(Object),
      );
    });
  });
});
