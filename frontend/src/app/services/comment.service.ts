import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Comment } from './post.service';

export { Comment };

export interface CreateCommentResponse {
  success: boolean;
  message?: string;
  data?: {
    tempId?: string;
    postId: string;
    userId: string;
    authorUsername: string;
    body: string;
    text?: string;
    createdAt: string;
    pending: boolean;
    likes: number;
    isEdited: boolean;
  };
  errors?: Array<{
    field: string;
    message: string;
  }>;
  status?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  private http = inject(HttpClient);
  private readonly API_URL = '/api/v1';

  /**
   * Create a new comment via API Gateway.
   * Uses optimistic UI pattern - comment appears immediately before server confirmation.
   *
   * @param postId - Post ID to comment on
   * @param body - Comment body (1-1000 characters)
   * @returns Observable with CreateCommentResponse
   */
  createComment(postId: string, body: string): Observable<CreateCommentResponse> {
    return this.http.post<CreateCommentResponse>(`${this.API_URL}/comments`, { postId, body });
  }

  /**
   * Get comments for a specific post
   */
  getPostComments(postId: string): Observable<{ success: boolean; data: Comment[] }> {
    return this.http.get<{ success: boolean; data: Comment[] }>(`${this.API_URL}/posts/post/${postId}/comments`);
  }

  /**
   * Remove optimistic comment from list on error.
   * Called by parent component when comment creation fails.
   */
  removeOptimisticComment(comments: Comment[], tempId: string): Comment[] {
    return comments.filter(c => c.tempId !== tempId);
  }
}
