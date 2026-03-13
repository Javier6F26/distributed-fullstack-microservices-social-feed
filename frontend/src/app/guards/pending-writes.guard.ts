import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { PendingWritesNotifyService } from '../services/pending-writes-notify.service';

/**
 * Guard that warns users if they try to navigate away with pending writes.
 */
export const pendingWritesGuard: CanDeactivateFn<unknown> = () => {
  const pendingWritesService = inject(PendingWritesNotifyService);

  if (pendingWritesService.hasPending()) {
    return confirm('You have pending writes. Are you sure you want to leave?');
  }

  return true;
};
