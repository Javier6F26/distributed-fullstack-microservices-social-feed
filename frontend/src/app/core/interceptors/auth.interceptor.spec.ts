import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('AuthInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockAccessToken = 'mock-access-token';
  const mockNewAccessToken = 'new-access-token';

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', [
      'getAccessToken',
      'refreshToken',
      'logout',
    ]);
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true,
        },
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpyObj },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(authServiceSpy).toBeDefined();
  });

  it('should add authorization header if token exists', () => {
    authServiceSpy.getAccessToken.and.returnValue(mockAccessToken);

    httpClient.get('/api/test').subscribe((response) => {
      expect(response).toEqual({ success: true });
    });

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockAccessToken}`);
    req.flush({ success: true });
  });

  it('should not add authorization header if token does not exist', () => {
    authServiceSpy.getAccessToken.and.returnValue(null);

    httpClient.get('/api/test').subscribe((response) => {
      expect(response).toEqual({ success: true });
    });

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ success: true });
  });

  it('should skip intercepting refresh endpoint', () => {
    authServiceSpy.getAccessToken.and.returnValue(mockAccessToken);

    httpClient.post('/auth/refresh', {}).subscribe((response) => {
      expect(response).toEqual({ success: true });
    });

    const req = httpMock.expectOne('/auth/refresh');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ success: true });
  });

  it('should handle 401 error by calling refreshToken', () => {
    authServiceSpy.getAccessToken.and.returnValues(mockAccessToken, null);
    authServiceSpy.refreshToken.and.returnValue(of({ accessToken: mockNewAccessToken }));

    // First request fails with 401
    httpClient.get('/api/test').subscribe((response) => {
      expect(response).toEqual({ success: true });
    });

    const req = httpMock.expectOne('/api/test');
    req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    // Expect refresh endpoint to be called
    const refreshReq = httpMock.expectOne('/auth/refresh');
    expect(refreshReq.request.method).toBe('POST');
    refreshReq.flush({ accessToken: mockNewAccessToken });

    // Original request should be retried with new token
    const retryReq = httpMock.expectOne('/api/test');
    expect(retryReq.request.headers.get('Authorization')).toBe(`Bearer ${mockNewAccessToken}`);
    retryReq.flush({ success: true });
  });

  it('should logout and redirect if refresh fails', () => {
    authServiceSpy.getAccessToken.and.returnValues(mockAccessToken, null);
    authServiceSpy.refreshToken.and.returnValue(throwError(() => new Error('Refresh failed')));
    authServiceSpy.logout.and.returnValue(of(null));

    httpClient.get('/api/test').subscribe({
      error: (error) => {
        expect(error.status).toBe(401);
      },
    });

    const req = httpMock.expectOne('/api/test');
    req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    // Expect logout to be called
    expect(authServiceSpy.logout).toHaveBeenCalled();

    // Expect redirect to login
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
