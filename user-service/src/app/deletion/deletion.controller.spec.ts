import { Test, TestingModule } from '@nestjs/testing';
import { DeletionController } from './deletion.controller';
import { DeletionService } from './deletion.service';
import { DeletionStatus } from './schemas/deletion-request.schema';

describe('DeletionController', () => {
  let controller: DeletionController;
  let service: DeletionService;

  const mockDeletionService = {
    requestDeletion: jest.fn(),
    processDeletionRequest: jest.fn(),
    getByUserId: jest.fn(),
    completeDeletion: jest.fn(),
    cancelDeletion: jest.fn(),
    markEmailSent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeletionController],
      providers: [
        {
          provide: DeletionService,
          useValue: mockDeletionService,
        },
      ],
    }).compile();

    controller = module.get<DeletionController>(DeletionController);
    service = module.get<DeletionService>(DeletionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestDeletion', () => {
    const mockRequest = {
      user: { sub: 'test-user-id' },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as any;

    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    it('should create deletion request for authenticated user', async () => {
      // Arrange
      const mockDeletionRequest = {
        _id: 'deletion-id',
        userId: 'test-user-id',
        scheduledDeletionAt: new Date(),
      };

      service.requestDeletion.mockResolvedValue(mockDeletionRequest);
      service.processDeletionRequest.mockResolvedValue({ revokedCount: 2 });
      service.markEmailSent.mockResolvedValue(undefined);

      // Act
      await controller.requestDeletion(mockRequest, mockResponse);

      // Assert
      expect(service.requestDeletion).toHaveBeenCalledWith(
        'test-user-id',
        '127.0.0.1',
      );
      expect(service.processDeletionRequest).toHaveBeenCalledWith(
        mockDeletionRequest,
      );
      expect(service.markEmailSent).toHaveBeenCalledWith(mockDeletionRequest);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('deletion request received'),
        }),
      );
    });

    it('should return 401 if user ID not found', async () => {
      // Arrange
      const invalidRequest = { user: {} } as any;

      // Act
      await controller.requestDeletion(invalidRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User ID not found',
      });
    });

    it('should return 400 if deletion already requested', async () => {
      // Arrange
      service.getByUserId.mockResolvedValue({
        _id: 'existing-deletion-id',
      });

      // Act
      await controller.requestDeletion(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('already pending'),
      });
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      service.requestDeletion.mockRejectedValue(new Error('Service error'));

      // Act
      await controller.requestDeletion(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Deletion request failed. Please try again.',
      });
    });
  });

  describe('getDeletionStatus', () => {
    const mockRequest = {
      user: { sub: 'test-user-id' },
    } as any;

    it('should return no pending request for user', async () => {
      // Arrange
      service.getByUserId.mockResolvedValue(null);

      // Act
      const result = await controller.getDeletionStatus(mockRequest);

      // Assert
      expect(result).toEqual({
        success: true,
        hasPendingRequest: false,
      });
    });

    it('should return pending deletion request details', async () => {
      // Arrange
      const mockDeletionRequest = {
        _id: 'deletion-id',
        status: DeletionStatus.PENDING,
        requestedAt: new Date(),
        scheduledDeletionAt: new Date(),
        emailSent: true,
      };

      service.getByUserId.mockResolvedValue(mockDeletionRequest);

      // Act
      const result = await controller.getDeletionStatus(mockRequest);

      // Assert
      expect(result).toEqual({
        success: true,
        hasPendingRequest: true,
        deletionRequest: expect.objectContaining({
          id: 'deletion-id',
          status: DeletionStatus.PENDING,
          emailSent: true,
        }),
      });
    });

    it('should return 401 if user ID not found', async () => {
      // Arrange
      const invalidRequest = { user: {} } as any;

      // Act
      const result = await controller.getDeletionStatus(invalidRequest);

      // Assert
      expect(result).toEqual({
        success: false,
        message: 'User ID not found',
      });
    });
  });

  describe('cancelDeletion', () => {
    const mockRequest = {
      user: { sub: 'test-user-id' },
    } as any;

    it('should cancel pending deletion request', async () => {
      // Arrange
      const mockDeletionRequest = { _id: 'deletion-id' };
      service.getByUserId.mockResolvedValue(mockDeletionRequest);
      service.cancelDeletion.mockResolvedValue(undefined);

      // Act
      const result = await controller.cancelDeletion(mockRequest);

      // Assert
      expect(service.getByUserId).toHaveBeenCalledWith('test-user-id');
      expect(service.cancelDeletion).toHaveBeenCalledWith(mockDeletionRequest);
      expect(result).toEqual({
        success: true,
        message: expect.stringContaining('cancelled'),
      });
    });

    it('should return error if no pending deletion found', async () => {
      // Arrange
      service.getByUserId.mockResolvedValue(null);

      // Act
      const result = await controller.cancelDeletion(mockRequest);

      // Assert
      expect(result).toEqual({
        success: false,
        message: expect.stringContaining('No pending deletion'),
      });
    });

    it('should return 401 if user ID not found', async () => {
      // Arrange
      const invalidRequest = { user: {} } as any;

      // Act
      const result = await controller.cancelDeletion(invalidRequest);

      // Assert
      expect(result).toEqual({
        success: false,
        message: 'User ID not found',
      });
    });
  });
});
