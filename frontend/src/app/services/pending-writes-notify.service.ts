import { Injectable, OnDestroy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, BehaviorSubject } from 'rxjs';

export interface PendingWriteError {
  tempId: string;
  error: string;
}

/**
 * Service to track pending writes and poll for confirmation.
 * Emits events when writes are confirmed or failed.
 * Feed components subscribe to update optimistic UI accordingly.
 */
@Injectable({ providedIn: 'root' })
export class PendingWritesNotifyService implements OnDestroy {
  private pending = new Map<string, number>(); // tempId -> startTime
  private errors = new Map<string, string>(); // tempId -> error message
  private intervalId?: any;
  private readonly POLL_INTERVAL = 1000; // 1 second
  private readonly TIMEOUT = 30000; // 30 seconds (same as Redis TTL)

  // Error events stream for feed components to subscribe
  private errorSubject = new BehaviorSubject<PendingWriteError[]>([]);
  public errors$ = this.errorSubject.asObservable();

  // Confirmation events stream - emits tempId and optional postId when confirmed
  private confirmedSubject = new Subject<{ tempId: string; postId?: string }>();
  public confirmed$ = this.confirmedSubject.asObservable();

  // Store confirmed tempIds for late subscribers
  private confirmedTempIds = new Set<string>();

  private http = inject(HttpClient);

  /**
   * Start tracking a pending write by tempId
   */
  track(tempId: string): void {
    this.pending.set(tempId, Date.now());
    this.startPolling();
  }

  /**
   * Check if a tempId was already confirmed
   */
  isConfirmed(tempId: string): boolean {
    return this.confirmedTempIds.has(tempId);
  }

  /**
   * Clear a confirmed tempId from the set
   */
  clearConfirmed(tempId: string): void {
    this.confirmedTempIds.delete(tempId);
  }

  /**
   * Check if there are any pending writes
   */
  hasPending(): boolean {
    return this.pending.size > 0;
  }

  /**
   * Get all current errors
   */
  getErrors(): Map<string, string> {
    return this.errors;
  }

  /**
   * Check if a specific tempId has an error
   */
  hasError(tempId: string): boolean {
    return this.errors.has(tempId);
  }

  /**
   * Get error message for a specific tempId
   */
  getError(tempId: string): string | undefined {
    return this.errors.get(tempId);
  }

  /**
   * Remove an error (e.g., after successful retry)
   */
  removeError(tempId: string): void {
    this.errors.delete(tempId);
    this.errorSubject.next(Array.from(this.errors.entries()).map(([tid, error]) => ({ tempId: tid, error })));
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors.clear();
    this.errorSubject.next([]);
  }

  private startPolling(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.poll(), this.POLL_INTERVAL);
  }

  private async poll(): Promise<void> {
    if (this.pending.size === 0) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      return;
    }

    for (const [tempId, startTime] of this.pending) {
      // Check if TTL expired (timeout)
      if (Date.now() - startTime > this.TIMEOUT) {
        this.errors.set(tempId, 'Request timed out. Please try again.');
        this.pending.delete(tempId);
        this.errorSubject.next(Array.from(this.errors.entries()).map(([tid, error]) => ({ tempId: tid, error })));
        this.confirmedSubject.next({ tempId }); // Also emit confirmed to clear pending flag
        continue;
      }

      try {
        const response: any = await this.http.get(`/api/v1/posts/pending/${tempId}`).toPromise();
        console.log(`[PendingWrites] Poll response for ${tempId}:`, response);
        
        if (response?.confirmed) {
          // Confirmed (not in cache anymore)
          this.pending.delete(tempId);
          this.confirmedTempIds.add(tempId); // Store for late subscribers
          // Emit with postId if available (for replacing optimistic _id)
          console.log(`[PendingWrites] Emitting confirmed for ${tempId} with postId:`, response.postId);
          this.confirmedSubject.next({ tempId, postId: response.postId });
        } else if (response?.error) {
          // Explicit error from server
          this.errors.set(tempId, response.error);
          this.pending.delete(tempId);
          this.errorSubject.next(Array.from(this.errors.entries()).map(([tid, error]) => ({ tempId: tid, error })));
          this.confirmedSubject.next({ tempId }); // Also emit confirmed to clear pending flag
        }
        // If pending: true, keep polling
      } catch (error: any) {
        // Network errors - keep polling
      }
    }
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
