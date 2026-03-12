import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, interval, Subscription, throwError } from 'rxjs';
import { tap, catchError, switchMap, filter } from 'rxjs/operators';
import { getTimeUntilExpiry } from '../shared/utils/token-utils';

export interface User {
  _id: string;
  username: string;
  email: string;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user: User;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000/api/v1';
  private http = inject(HttpClient);

  // Authentication state signals
  private userSignal = signal<User | null>(null);
  private isAuthenticatedSignal = signal<boolean>(false);
  private loadingSignal = signal<boolean>(false);
  private accessTokenSignal = signal<string | null>(null);
  private refreshingSignal = signal<boolean>(false);

  // Public computed signals
  user = computed(() => this.userSignal());
  isAuthenticated = computed(() => this.isAuthenticatedSignal());
  loading = computed(() => this.loadingSignal());
  isRefreshing = computed(() => this.refreshingSignal());

  // Token refresh subscription
  private refreshSubscription: Subscription | null = null;

  // Refresh timing configuration
  private readonly REFRESH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes
  private readonly REFRESH_THRESHOLD_MS = 2 * 60 * 1000; // Refresh when < 2 minutes remaining
  private readonly REFRESH_BUFFER_MS = 30 * 1000; // 30 second buffer

  constructor() {
    // Check for existing session on init
    this.loadSession();

    // Start proactive token refresh if authenticated
    if (this.isAuthenticatedSignal()) {
      this.startProactiveRefresh();
    }

    // Listen for cross-tab logout events
    this.listenForCrossTabLogout();
  }

  /**
   * Listen for logout events from other tabs
   */
  private listenForCrossTabLogout(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('auth_logout_sync');
        channel.onmessage = (event) => {
          if (event.data.type === 'logout') {
            console.log('Cross-tab logout detected, clearing local state');
            this.clearAuthState();
          }
        };
      } catch (error) {
        console.warn('Failed to setup cross-tab logout listener:', error);
      }
    }
  }

  /**
   * Register a new user
   */
  register(registerData: RegisterRequest): Observable<AuthResponse> {
    this.loadingSignal.set(true);

    return this.http.post<AuthResponse>(`${this.API_URL}/auth/register`, registerData, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      withCredentials: true,
    }).pipe(
      tap((response) => {
        this.setAuthState(response);
        this.startProactiveRefresh();
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.loadingSignal.set(false);
        throw error;
      }),
    );
  }

  /**
   * Login user
   */
  login(loginData: LoginRequest): Observable<AuthResponse> {
    this.loadingSignal.set(true);

    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, loginData, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      withCredentials: true,
    }).pipe(
      tap((response) => {
        this.setAuthState(response);
        this.startProactiveRefresh();
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.loadingSignal.set(false);
        throw error;
      }),
    );
  }

  /**
   * Logout user
   */
  logout(): Observable<unknown> {
    this.stopProactiveRefresh();

    return this.http.post(`${this.API_URL}/auth/logout`, {}, {
      withCredentials: true,
    }).pipe(
      tap(() => {
        this.clearAuthState();
        // Broadcast logout to other tabs
        this.broadcastLogoutEvent();
      }),
      catchError((error) => {
        // Clear state even if logout fails
        this.clearAuthState();
        this.broadcastLogoutEvent();
        return throwError(() => error);
      }),
    );
  }

  /**
   * Request account deletion
   */
  requestAccountDeletion(): Observable<unknown> {
    this.stopProactiveRefresh();

    return this.http.delete(`${this.API_URL}/account`, {
      withCredentials: true,
    }).pipe(
      tap(() => {
        this.clearAuthState();
        // Broadcast logout to other tabs
        this.broadcastLogoutEvent();
      }),
      catchError((error) => {
        // Clear state even if deletion fails
        this.clearAuthState();
        this.broadcastLogoutEvent();
        return throwError(() => error);
      }),
    );
  }

  /**
   * Broadcast logout event to other tabs
   */
  private broadcastLogoutEvent(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('auth_logout_sync');
        channel.postMessage({ type: 'logout', timestamp: Date.now() });
        channel.close();
      } catch (error) {
        console.warn('Failed to broadcast logout event:', error);
      }
    }
  }

  /**
   * Refresh access token
   */
  refreshToken(): Observable<AuthResponse> {
    this.refreshingSignal.set(true);

    return this.http.post<AuthResponse>(`${this.API_URL}/auth/refresh`, {}, {
      withCredentials: true,
    }).pipe(
      tap((response) => {
        this.accessTokenSignal.set(response.accessToken);
        sessionStorage.setItem('access_token', response.accessToken);
        this.refreshingSignal.set(false);
      }),
      catchError((error) => {
        this.refreshingSignal.set(false);
        throw error;
      }),
    );
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticatedUser(): boolean {
    return this.isAuthenticatedSignal();
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.userSignal();
  }

  /**
   * Get access token for API calls
   */
  getAccessToken(): string | null {
    return this.accessTokenSignal();
  }

  /**
   * Get auth headers for API calls
   */
  getAuthHeaders(): HttpHeaders {
    const token = this.getAccessToken();
    if (token) {
      return new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      });
    }
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  /**
   * Set authentication state
   */
  private setAuthState(response: AuthResponse): void {
    this.userSignal.set(response.user);
    this.isAuthenticatedSignal.set(true);
    this.accessTokenSignal.set(response.accessToken);

    // Store access token in sessionStorage
    sessionStorage.setItem('access_token', response.accessToken);
    sessionStorage.setItem('user', JSON.stringify(response.user));
  }

  /**
   * Clear authentication state
   */
  private clearAuthState(): void {
    this.userSignal.set(null);
    this.isAuthenticatedSignal.set(false);
    this.accessTokenSignal.set(null);
    this.refreshingSignal.set(false);
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('user');
    this.stopProactiveRefresh();
  }

  /**
   * Load session from sessionStorage
   */
  private loadSession(): void {
    const token = sessionStorage.getItem('access_token');
    const userStr = sessionStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        this.accessTokenSignal.set(token);
        this.userSignal.set(user);
        this.isAuthenticatedSignal.set(true);
      } catch (_) {
        this.clearAuthState();
      }
    }
  }

  /**
   * Start proactive token refresh
   * Checks token expiry every 5 minutes and refreshes when needed
   * Falls back to immediate refresh if token expiry cannot be determined
   */
  private startProactiveRefresh(): void {
    this.stopProactiveRefresh(); // Clear any existing subscription

    this.refreshSubscription = interval(this.REFRESH_CHECK_INTERVAL_MS)
      .pipe(
        filter(() => this.isAuthenticatedSignal()),
        switchMap(() => {
          const token = this.getAccessToken();
          if (!token) {
            return [];
          }

          const timeUntilExpiry = getTimeUntilExpiry(token, this.REFRESH_BUFFER_MS);

          // If we can't determine expiry (null), trigger refresh as safety measure
          if (timeUntilExpiry === null) {
            console.warn('Cannot determine token expiry - triggering refresh as safety measure');
            return this.refreshToken();
          }

          // Refresh if token is expiring soon
          if (timeUntilExpiry < this.REFRESH_THRESHOLD_MS) {
            return this.refreshToken();
          }

          return [];
        })
      )
      .subscribe();
  }

  /**
   * Stop proactive token refresh
   */
  private stopProactiveRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = null;
    }
  }

  /**
   * Manually trigger token refresh (e.g., before critical operations)
   */
  forceRefresh(): Observable<AuthResponse> {
    return this.refreshToken();
  }

  /**
   * Check if token is about to expire
   */
  isTokenExpiringSoon(): boolean {
    const token = this.getAccessToken();
    if (!token) {
      return false;
    }

    const timeUntilExpiry = getTimeUntilExpiry(token, this.REFRESH_BUFFER_MS);
    return timeUntilExpiry !== null && timeUntilExpiry < this.REFRESH_THRESHOLD_MS;
  }
}
