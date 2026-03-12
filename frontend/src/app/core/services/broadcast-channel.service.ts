import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * BroadcastChannel service for cross-tab authentication synchronization
 * Ensures all tabs stay in sync for login/logout/refresh events
 */
@Injectable({
  providedIn: 'root',
})
export class BroadcastChannelService implements OnDestroy {
  private channel: BroadcastChannel | null = null;
  private messageSubject = new Subject<unknown>();

  // Observable for receiving messages from other tabs
  messages$ = this.messageSubject.asObservable();

  constructor() {
    this.initChannel();
  }

  /**
   * Initialize BroadcastChannel for auth synchronization
   */
  private initChannel(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('auth_sync_channel');
        
        this.channel.onmessage = (event) => {
          console.debug('Received message from other tab:', event.data);
          this.messageSubject.next(event.data);
        };

        this.channel.onmessageerror = (error) => {
          console.error('Message error:', error);
        };

        console.log('BroadcastChannel initialized for auth synchronization');
      } catch (error) {
        console.warn('Failed to initialize BroadcastChannel:', error);
      }
    } else {
      console.warn('BroadcastChannel not supported in this browser');
    }
  }

  /**
   * Broadcast authentication event to all tabs
   */
  broadcastAuthEvent(eventType: 'login' | 'logout' | 'refresh' | 'refresh_failed', data?: unknown): void {
    if (this.channel) {
      const message = {
        type: eventType,
        timestamp: Date.now(),
        source: this.getSourceId(),
        data,
      };

      console.debug('Broadcasting auth event:', message);
      this.channel.postMessage(message);
    }
  }

  /**
   * Broadcast login event
   */
  broadcastLogin(userId: string): void {
    this.broadcastAuthEvent('login', { userId });
  }

  /**
   * Broadcast logout event
   */
  broadcastLogout(): void {
    this.broadcastAuthEvent('logout');
  }

  /**
   * Broadcast refresh event
   */
  broadcastRefresh(success: boolean): void {
    this.broadcastAuthEvent(success ? 'refresh' : 'refresh_failed');
  }

  /**
   * Get unique source ID for this tab
   */
  private getSourceId(): string {
    if (!sessionStorage.getItem('tab_id')) {
      sessionStorage.setItem('tab_id', `tab_${Math.random().toString(36).substr(2, 9)}`);
    }
    return sessionStorage.getItem('tab_id') || 'unknown';
  }

  /**
   * Close BroadcastChannel
   */
  ngOnDestroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
      console.log('BroadcastChannel closed');
    }
  }
}
