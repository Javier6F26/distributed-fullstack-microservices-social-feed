import { Test, TestingModule } from '@nestjs/testing';
import { DeletionController } from './deletion.controller';
import { DeletionHandlerService } from './deletion-handler.service';

describe('DeletionController', () => {
  let controller: DeletionController;
  let handlerService: DeletionHandlerService;

  const mockHandlerService = {
    anonymizeUserPosts: jest.fn(),
    getPostCountByUser: jest.fn(),
    getPostsByUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeletionController],
      providers: [
        {
          provide: DeletionHandlerService,
          useValue: mockHandlerService,
        },
      ],
    }).compile();

    controller = module.get<DeletionController>(DeletionController);
    handlerService = module.get<DeletionHandlerService>(DeletionHandlerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('anonymizeUserContent', () => {
    it('should anonymize all posts for deleted user', async () => {
      // Arrange
      const userId = 'test-user-id';
      mockHandlerService.getPostCountByUser.mockResolvedValue(10);
      mockHandlerService.anonymizeUserPosts.mockResolvedValue(10);

      // Act
      const result = await controller.anonymizeUserContent({ userId });

      // Assert
      expect(handlerService.getPostCountByUser).toHaveBeenCalledWith(userId);
      expect(handlerService.anonymizeUserPosts).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        success: true,
        message: 'Anonymized 10 posts',
        postCount: 10,
        anonymizedCount: 10,
      });
    });

    it('should handle partial anonymization', async () => {
      // Arrange
      mockHandlerService.getPostCountByUser.mockResolvedValue(10);
      mockHandlerService.anonymizeUserPosts.mockResolvedValue(8);

      // Act
      const result = await controller.anonymizeUserContent({ userId: 'test-user-id' });

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Anonymized 8 posts',
        postCount: 10,
        anonymizedCount: 8,
      });
    });

    it('should return error if userId is missing', async () => {
      // Act
      const result = await controller.anonymizeUserContent({} as any);

      // Assert
      expect(result).toEqual({
        success: false,
        message: 'userId is required',
      });
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockHandlerService.anonymizeUserPosts.mockRejectedValue(
        new Error('Database error'),
      );

      // Act
      const result = await controller.anonymizeUserContent({ userId: 'test-user-id' });

      // Assert
      expect(result).toEqual({
        success: false,
        message: 'Failed to anonymize posts',
        error: 'Database error',
      });
    });
  });
});
