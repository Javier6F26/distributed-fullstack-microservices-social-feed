import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

export interface Comment {
  _id: string;
  postId: string;
  authorId: string;
  name: string;
  email: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  tempId?: string; // For optimistic UI
  pending?: boolean;
}

export interface Post {
  _id: string;
  authorId: string;
  author: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  recentComments?: Comment[];
  pending?: boolean; // For optimistic UI
  tempId?: string; // For correlating optimistic posts with real ones
  commentCount?: number;
  deleted?: boolean;
}

export interface CreatePostResponse {
  success: boolean;
  message?: string;
  data?: {
    _id?: string;
    tempId?: string;
    userId: string;
    authorId?: string;
    author?: string;
    title: string;
    body: string;
    content?: string; // Alias for body (transformed by API Gateway)
    createdAt: string;
    pending: boolean;
    commentCount: number;
    deleted: boolean;
  };
  errors?: Array<{
    field: string;
    message: string;
  }>;
  status?: number;
}

export interface ApiResponse {
  success: boolean;
  data: Post[];
  nextCursor?: string | null;
}

export interface CommentsResponse {
  success: boolean;
  data: Comment[];
}

@Injectable({
  providedIn: 'root',
})
export class PostService {
  private http = inject(HttpClient);
  private readonly API_URL = '/api/v1';

  getPosts(limit = 20, cursor?: string | null): Observable<ApiResponse> {
    let params = new HttpParams().set('limit', limit);
    if (cursor) {
      params = params.set('cursor', cursor);
    }
    return this.http.get<ApiResponse>(`${this.API_URL}/posts`, { params }).pipe(
      tap(response => console.log('[PostService] Posts fetched:', response.data.length)),
      delay(100) // Simular latencia de red para UX consistente
    );
  }

  searchPosts(query: string, limit = 20, cursor?: string | null): Observable<ApiResponse> {
    let params = new HttpParams()
      .set('q', query)
      .set('limit', limit);
    if (cursor) {
      params = params.set('cursor', cursor);
    }
    return this.http.get<ApiResponse>(`${this.API_URL}/posts/search`, { params }).pipe(
      tap(response => console.log('[PostService] Search results:', response.data.length)),
      delay(50)
    );
  }

  filterPosts(startDate?: string, endDate?: string, limit = 20, cursor?: string | null): Observable<ApiResponse> {
    let params = new HttpParams().set('limit', limit);
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }
    if (cursor) {
      params = params.set('cursor', cursor);
    }
    return this.http.get<ApiResponse>(`${this.API_URL}/posts/filter`, { params });
  }

  searchAndFilterPosts(
    query?: string,
    startDate?: string,
    endDate?: string,
    limit = 20,
    cursor?: string | null,
  ): Observable<ApiResponse> {
    let params = new HttpParams().set('limit', limit);
    if (query) {
      params = params.set('q', query);
    }
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }
    if (cursor) {
      params = params.set('cursor', cursor);
    }
    return this.http.get<ApiResponse>(`${this.API_URL}/posts/search-filter`, { params });
  }

  getPostComments(postId: string): Observable<CommentsResponse> {
    return this.http.get<CommentsResponse>(`${this.API_URL}/posts/post/${postId}/comments`);
  }

  /**
   * Create a new post via API Gateway.
   * Uses optimistic UI pattern - post appears immediately before server confirmation.
   *
   * @param title - Post title (5-100 characters)
   * @param body - Post body (10-5000 characters)
   * @returns Observable with CreatePostResponse
   */
  createPost(title: string, body: string, tempId?: string): Observable<CreatePostResponse> {
    const payload: any = { title, body };
    if (tempId) {
      payload.tempId = tempId;
    }
    return this.http.post<CreatePostResponse>(`${this.API_URL}/posts`, payload);
  }

  /**
   * Remove optimistic post from feed on error.
   * Called by feed component when post creation fails.
   */
  removeOptimisticPost(posts: Post[], tempId: string): Post[] {
    return posts.filter(p => p.tempId !== tempId);
  }

  /**
   * Delete a post by ID.
   * Only the author can delete their own post.
   *
   * @param postId - Post ID to delete
   * @returns Observable<void> on success
   */
  deletePost(postId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/posts/${postId}`);
  }

  /**
   * Update a post by ID.
   * Only the author can update their own post.
   *
   * @param postId - Post ID to update
   * @param title - New title (5-100 characters)
   * @param body - New body (10-5000 characters)
   * @returns Observable<CreatePostResponse> with updated post
   */
  updatePost(postId: string, title: string, body: string): Observable<CreatePostResponse> {
    return this.http.put<CreatePostResponse>(`${this.API_URL}/posts/${postId}`, { title, body });
  }
}
