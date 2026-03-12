import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Comment {
  _id: string;
  text: string;
  postId: string;
  author?: string;
  authorUsername?: string;
  createdAt?: string;
  likes?: number;
  tempId?: string; // For optimistic UI
  body?: string; // Alias for text
  isEdited?: boolean;
  pending?: boolean;
  userId?: string;
}

export interface Post {
  _id: string;
  title: string;
  content: string;
  author: string;
  createdAt?: string;
  recentComments?: Comment[];
  pending?: boolean; // For optimistic UI
  tempId?: string; // For correlating optimistic posts with real ones
}

export interface CreatePostResponse {
  success: boolean;
  message?: string;
  data?: {
    tempId?: string;
    userId: string;
    title: string;
    body: string;
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
    return this.http.get<ApiResponse>(`${this.API_URL}/posts`, { params });
  }

  searchPosts(query: string, limit = 20, cursor?: string | null): Observable<ApiResponse> {
    let params = new HttpParams()
      .set('q', query)
      .set('limit', limit);
    if (cursor) {
      params = params.set('cursor', cursor);
    }
    return this.http.get<ApiResponse>(`${this.API_URL}/posts/search`, { params });
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
  createPost(title: string, body: string): Observable<CreatePostResponse> {
    return this.http.post<CreatePostResponse>(`${this.API_URL}/posts`, { title, body });
  }

  /**
   * Remove optimistic post from feed on error.
   * Called by feed component when post creation fails.
   */
  removeOptimisticPost(posts: Post[], tempId: string): Post[] {
    return posts.filter(p => p.tempId !== tempId);
  }
}
