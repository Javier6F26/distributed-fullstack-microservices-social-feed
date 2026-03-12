import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeletionService } from './deletion.service';
import { DeletionRequest, DeletionRequestDocument, DeletionStatus } from './schemas/deletion-request.schema';
import { RefreshTokenService } from '../refresh-token/refresh-token.service';

describe('DeletionService', () => {
  let service: DeletionService;
  let deletionRequestModel: Model<DeletionRequestDocument>;
  let refreshTokenService: RefreshTokenService;

  const mockDeletionRequest = {
    _id: 'test-deletion-id',
    userId: 'test-user-id',
    status: DeletionStatus.PENDING,
    requestedAt: new Date(),
    scheduledDeletionAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    ipAddress: '127.0.0.1',
    emailSent: false,
    save: jest.fn(),
  };

  const mockDeletionRequestModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockRefreshTokenService = {
    revokeAllUserTokens: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeletionService,
        {
          provide: getModelToken(DeletionRequest.name),
          useValue: mockDeletionRequestModel,
        },
        {
          provide: RefreshTokenService,
          useValue: mockRefreshTokenService,
        },
      ],
    }).compile();

    service = module.get<DeletionService>(DeletionService);
    deletionRequestModel = module.get<Model<DeletionRequestDocument>>(
      getModelToken(DeletionRequest.name),
    );
    refreshTokenService = module.get<RefreshTokenService>(RefreshTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestDeletion', () => {
    it('should create a deletion request with 72-hour window', async () => {
      // Arrange
      const userId = 'test-user-id';
      const ipAddress = '127.0.0.1';
      const now = new Date();
      
      mockDeletionRequestModel.create.mockResolvedValue(mockDeletionRequest);

      // Act
      const result = await service.requestDeletion(userId, ipAddress);

      // Assert
      expect(deletionRequestModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          status: DeletionStatus.PENDING,
          ipAddress,
        }),
      );
      expect(result).toBeDefined();
      expect(result.scheduledDeletionAt).toBeDefined();
    });

    it('should calculate scheduledDeletionAt as 72 hours from now', async () => {
      // Arrange
      const userId = 'test-user-id';
      mockDeletionRequestModel.create.mockResolvedValue(mockDeletionRequest);

      // Act
      await service.requestDeletion(userId);

      // Assert
      const createdData = mockDeletionRequestModel.create.mock.calls[0][0];
      const scheduledDeletionAt = new Date(createdData.scheduledDeletionAt);
      const expectedDeletionAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
      
      // Allow 1 second tolerance
      expect(Math.abs(scheduledDeletionAt.getTime() - expectedDeletionAt.getTime()))
        .toBeLessThan(1000);
    });
  });

  describe('processDeletionRequest', () => {
    it('should revoke all user tokens and update status', async () => {
      // Arrange
      const mockRevokedCount = 5;
      mockRefreshTokenService.revokeAllUserTokens.mockResolvedValue(mockRevokedCount);
      mockDeletionRequest.save.mockResolvedValue(mockDeletionRequest);

      // Act
      const result = await service.processDeletionRequest(
        mockDeletionRequest as DeletionRequestDocument,
      );

      // Assert
      expect(refreshTokenService.revokeAllUserTokens).toHaveBeenCalledWith(
        mockDeletionRequest.userId,
      );
      expect(mockDeletionRequest.save).toHaveBeenCalled();
      expect(mockDeletionRequest.status).toBe(DeletionStatus.PROCESSING);
      expect(result).toEqual({ revokedCount: mockRevokedCount });
    });
  });

  describe('getPendingDeletions', () => {
    it('should return deletion requests where scheduledDeletionAt < now', async () => {
      // Arrange
      const now = new Date();
      const pastDeletion = {
        ...mockDeletionRequest,
        scheduledDeletionAt: new Date(now.getTime() - 1000),
      };
      
      mockDeletionRequestModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([pastDeletion]),
      });

      // Act
      const result = await service.getPendingDeletions();

      // Assert
      expect(deletionRequestModel.find).toHaveBeenCalledWith({
        status: DeletionStatus.PENDING,
        scheduledDeletionAt: { $lte: expect.any(Date) },
      });
      expect(result).toHaveLength(1);
    });

    it('should return empty array if no pending deletions', async () => {
      // Arrange
      mockDeletionRequestModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result = await service.getPendingDeletions();

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('completeDeletion', () => {
    it('should mark deletion request as completed', async () => {
      // Arrange
      mockDeletionRequest.save.mockResolvedValue(mockDeletionRequest);

      // Act
      await service.completeDeletion(mockDeletionRequest as DeletionRequestDocument);

      // Assert
      expect(mockDeletionRequest.status).toBe(DeletionStatus.COMPLETED);
      expect(mockDeletionRequest.completedAt).toBeDefined();
      expect(mockDeletionRequest.save).toHaveBeenCalled();
    });
  });

  describe('cancelDeletion', () => {
    it('should mark deletion request as cancelled', async () => {
      // Arrange
      mockDeletionRequest.save.mockResolvedValue(mockDeletionRequest);

      // Act
      await service.cancelDeletion(mockDeletionRequest as DeletionRequestDocument);

      // Assert
      expect(mockDeletionRequest.status).toBe(DeletionStatus.CANCELLED);
      expect(mockDeletionRequest.save).toHaveBeenCalled();
    });
  });

  describe('getByUserId', () => {
    it('should return pending deletion request for user', async () => {
      // Arrange
      const userId = 'test-user-id';
      mockDeletionRequestModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDeletionRequest),
      });

      // Act
      const result = await service.getByUserId(userId);

      // Assert
      expect(deletionRequestModel.findOne).toHaveBeenCalledWith({
        userId,
        status: DeletionStatus.PENDING,
      });
      expect(result).toEqual(mockDeletionRequest);
    });

    it('should return null if no pending deletion found', async () => {
      // Arrange
      mockDeletionRequestModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // Act
      const result = await service.getByUserId('test-user-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('markEmailSent', () => {
    it('should mark email as sent with timestamp', async () => {
      // Arrange
      mockDeletionRequest.save.mockResolvedValue(mockDeletionRequest);

      // Act
      await service.markEmailSent(mockDeletionRequest as DeletionRequestDocument);

      // Assert
      expect(mockDeletionRequest.emailSent).toBe(true);
      expect(mockDeletionRequest.emailSentAt).toBeDefined();
      expect(mockDeletionRequest.save).toHaveBeenCalled();
    });
  });
});
