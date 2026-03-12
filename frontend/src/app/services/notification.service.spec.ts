import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { environment } from '../../environments/environment';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('show', () => {
    it('should add notification to the list', () => {
      // Act
      service.show('Test message', 'info', 3000);

      // Assert
      const notifications = service.notifications();
      expect(notifications.length).toBe(1);
      expect(notifications[0].message).toBe('Test message');
      expect(notifications[0].type).toBe('info');
    });

    it('should auto-dismiss notification after duration', (done) => {
      // Act
      service.show('Test message', 'info', 100);

      // Assert
      expect(service.notifications().length).toBe(1);

      setTimeout(() => {
        expect(service.notifications().length).toBe(0);
        done();
      }, 150);
    });
  });

  describe('error - deduplication', () => {
    it('should show first error notification', () => {
      // Arrange
      const error = { status: 500, message: 'Internal Server Error' };

      // Act
      service.error(error, 3000);

      // Assert
      expect(service.notifications().length).toBe(1);
      expect(service.notifications()[0].type).toBe('error');
    });

    it('should suppress duplicate error within debounce window', () => {
      // Arrange
      const error = { status: 500, message: 'Internal Server Error' };
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Act - first error
      service.error(error, 3000);
      expect(service.notifications().length).toBe(1);

      // Act - duplicate error (should be suppressed)
      service.error(error, 3000);

      // Assert - still only 1 notification
      expect(service.notifications().length).toBe(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Suppressed duplicate error')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should allow different errors to show', () => {
      // Arrange
      const error1 = { status: 500, message: 'Internal Server Error' };
      const error2 = { status: 404, message: 'Not Found' };

      // Act
      service.error(error1, 3000);
      service.error(error2, 3000);

      // Assert - both errors should show
      expect(service.notifications().length).toBe(2);
    });

    it('should allow same error after debounce window expires', (done) => {
      // Arrange
      const error = { status: 500, message: 'Internal Server Error' };

      // Act - first error
      service.error(error, 100);

      setTimeout(() => {
        // Act - same error after debounce (should show)
        service.error(error, 3000);

        // Assert - should have 2 notifications total
        expect(service.notifications().length).toBe(2);
        done();
      }, 3500);
    });
  });

  describe('error - user-friendly messages', () => {
    it('should convert 401 error to user-friendly message', () => {
      // Arrange
      const error = { status: 401 };

      // Act
      service.error(error, 3000);

      // Assert
      const notification = service.notifications()[0];
      expect(notification.message).toContain('session has expired');
      expect(notification.message).toContain('log in again');
    });

    it('should convert 0 status to connection error message', () => {
      // Arrange
      const error = { status: 0 };

      // Act
      service.error(error, 3000);

      // Assert
      const notification = service.notifications()[0];
      expect(notification.message).toContain('Unable to connect');
      expect(notification.message).toContain('internet connection');
    });

    it('should convert 429 to rate limit message', () => {
      // Arrange
      const error = { status: 429 };

      // Act
      service.error(error, 3000);

      // Assert
      const notification = service.notifications()[0];
      expect(notification.message).toContain('Too many requests');
      expect(notification.message).toContain('wait a moment');
    });

    it('should use generic fallback for unknown errors', () => {
      // Arrange
      const error = { custom: 'unknown error' };

      // Act
      service.error(error, 3000);

      // Assert
      const notification = service.notifications()[0];
      expect(notification.message).toContain('Something went wrong');
    });

    it('should handle string errors', () => {
      // Arrange
      const errorMessage = 'Custom error message';

      // Act
      service.error(errorMessage, 3000);

      // Assert
      const notification = service.notifications()[0];
      expect(notification.message).toBe(errorMessage);
    });
  });

  describe('notification queue', () => {
    it('should process notifications sequentially', (done) => {
      // Arrange
      const error1 = { status: 500 };
      const error2 = { status: 502 };
      const error3 = { status: 503 };

      // Act - rapid fire multiple errors
      service.error(error1, 100);
      service.error(error2, 100);
      service.error(error3, 100);

      // Initial: first error should show immediately
      expect(service.notifications().length).toBe(1);

      // After some time, queue should process
      setTimeout(() => {
        // Should have processed some notifications
        expect(service.notifications().length).toBeGreaterThanOrEqual(1);
        done();
      }, 500);
    });
  });

  describe('other notification types', () => {
    it('should show info notification', () => {
      service.info('Info message', 3000);
      expect(service.notifications()[0].type).toBe('info');
    });

    it('should show success notification', () => {
      service.success('Success message', 3000);
      expect(service.notifications()[0].type).toBe('success');
    });

    it('should show warning notification', () => {
      service.warning('Warning message', 3000);
      expect(service.notifications()[0].type).toBe('warning');
    });
  });

  describe('dismiss', () => {
    it('should remove notification by id', () => {
      // Arrange
      service.show('Test', 'info', 10000);
      const id = service.notifications()[0].id;

      // Act
      service.dismiss(id);

      // Assert
      expect(service.notifications().length).toBe(0);
    });
  });
});
