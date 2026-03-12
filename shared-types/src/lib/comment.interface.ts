import type { Comment } from './post.interface.js';

/**
 * Interface for optimistic comment (before database persistence).
 * Used by frontend for optimistic UI updates.
 * 
 * Note: Base Comment interface is exported from post.interface.ts
 */
export interface OptimisticComment extends Comment {
  pending: boolean;
  tempId?: string; // Client-generated UUID for correlation
}
