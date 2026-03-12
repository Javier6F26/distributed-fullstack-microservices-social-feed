import { TestBed } from '@angular/core/testing';
import { GlobalErrorHandler } from './global-error.handler';
import { NotificationService } from '../../services/notification.service';

describe('GlobalErrorHandler', () => {
  let errorHandler: GlobalErrorHandler;
  let notificationService: NotificationService;

  const mockNotificationService = {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    show: jest.fn(),
    dismiss: jest.fn(),
    notifications: { update: jest.fn() }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandler,
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    });

    errorHandler = TestBed.inject(GlobalErrorHandler);
    notificationService = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(errorHandler).toBeTruthy();
  });

  describe('handleError', () => {
    it('should suppress 401 errors and not show notification', () => {
      // Arrange
      const http401Error = { status: 401, message: 'Unauthorized' };
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Act
      errorHandler.handleError(http401Error);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Suppressing 401 notification')
      );
      expect(notificationService.error).not.toHaveBeenCalled();
      
      consoleWarnSpy.mockRestore();
    });

    it('should show notification for non-401 errors', () => {
      // Arrange
      const http500Error = { status: 500, message: 'Internal Server Error' };

      // Act
      errorHandler.handleError(http500Error);

      // Assert
      expect(notificationService.error).toHaveBeenCalledWith(
        'An internal server error occurred. Please try again later.',
        5000
      );
    });

    it('should handle generic errors with message', () => {
      // Arrange
      const genericError = { message: 'Something went wrong' };

      // Act
      errorHandler.handleError(genericError);

      // Assert
      expect(notificationService.error).toHaveBeenCalledWith(
        'Something went wrong',
        5000
      );
    });

    it('should use fallback message for unknown errors', () => {
      // Arrange
      const unknownError = {};

      // Act
      errorHandler.handleError(unknownError);

      // Assert
      expect(notificationService.error).toHaveBeenCalledWith(
        'An unexpected error occurred. Please try again.',
        5000
      );
    });
  });
});
