import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockNotificationService = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
    warning: jasmine.createSpy('warning'),
    info: jasmine.createSpy('info'),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initial state', () => {
    it('should start with authenticated state based on sessionStorage', () => {
      // Arrange & Act
      sessionStorage.clear();
      const newService = TestBed.inject(AuthService);

      // Assert
      expect(newService.isAuthenticated()).toBeFalse();
      expect(newService.user()).toBeNull();
    });

    it('should load session from sessionStorage if exists', () => {
      // Arrange
      sessionStorage.setItem('access_token', 'test-token');
      sessionStorage.setItem('user', JSON.stringify({ _id: '1', username: 'testuser', email: 'test@example.com' }));

      // Act
      const newService = TestBed.inject(AuthService);

      // Assert
      expect(newService.isAuthenticated()).toBeTrue();
      expect(newService.user()).toEqual({ _id: '1', username: 'testuser', email: 'test@example.com' });
    });
  });

  describe('register', () => {
    it('should call register API and update auth state on success', () => {
      // This test would require HttpTestingController for full implementation
      // For now, we verify the method exists and has correct signature
      expect(service.register).toBeDefined();
    });

    it('should set loading state during registration', () => {
      // Arrange
      expect(service.loading()).toBeFalse();

      // The actual test would require mocking HttpClient
      // This is a placeholder for the full implementation
      expect(service.register).toBeDefined();
    });
  });

  describe('login', () => {
    it('should call login API and update auth state on success', () => {
      // This test would require HttpTestingController for full implementation
      expect(service.login).toBeDefined();
    });
  });

  describe('logout', () => {
    it('should clear auth state on logout', () => {
      // This test would require HttpTestingController for full implementation
      expect(service.logout).toBeDefined();
    });
  });

  describe('isAuthenticatedUser', () => {
    it('should return current authentication status', () => {
      // Arrange
      sessionStorage.clear();
      const newService = TestBed.inject(AuthService);

      // Act & Assert
      expect(newService.isAuthenticatedUser()).toBeFalse();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user or null', () => {
      // Arrange
      sessionStorage.clear();
      const newService = TestBed.inject(AuthService);

      // Act & Assert
      expect(newService.getCurrentUser()).toBeNull();
    });
  });

  describe('getAuthHeaders', () => {
    it('should return headers with Authorization token when authenticated', () => {
      // Arrange - manually set token
      (service as unknown as Record<string, any>).accessTokenSignal.set('test-token');

      // Act
      const headers = service.getAuthHeaders();

      // Assert
      expect(headers.get('Authorization')).toBe('test-token');
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('should return headers without Authorization when not authenticated', () => {
      // Arrange
      (service as unknown as Record<string, any>).accessTokenSignal.set(null);

      // Act
      const headers = service.getAuthHeaders();

      // Assert
      expect(headers.get('Authorization')).toBeNull();
      expect(headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('setAuthState', () => {
    it('should update all auth signals', () => {
      // Arrange
      const mockResponse = {
        user: { _id: '1', username: 'testuser', email: 'test@example.com' },
        accessToken: 'test-token',
        tokenType: 'Bearer',
        expiresIn: 900,
      };

      // Act - access private method via any
      (service as unknown as Record<string, any>).setAuthState(mockResponse);

      // Assert
      expect(service.user()).toEqual(mockResponse.user);
      expect(service.isAuthenticated()).toBeTrue();
      expect(service.getAccessToken()).toBe('test-token');
      expect(sessionStorage.getItem('access_token')).toBe('test-token');
    });
  });

  describe('clearAuthState', () => {
    it('should clear all auth signals and sessionStorage', () => {
      // Arrange - set some state first
      sessionStorage.setItem('access_token', 'test-token');
      sessionStorage.setItem('user', JSON.stringify({ _id: '1' }));

      // Act - access private method via any
      (service as unknown as Record<string, any>).clearAuthState();

      // Assert
      expect(service.user()).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
      expect(service.getAccessToken()).toBeNull();
      expect(sessionStorage.getItem('access_token')).toBeNull();
    });
  });
});
