/**
 * Interface representing a Post entity.
 * Used across API Gateway, Post Service, and Frontend for type safety.
 */
export interface Post {
  _id?: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string; // ISO 8601 format
  commentCount: number;
  deleted?: boolean;
  deletedAt?: string;
  authorDeleted?: boolean;
}

/**
 * Interface for optimistic post (before database persistence).
 * Used by frontend for optimistic UI updates.
 */
export interface OptimisticPost extends Post {
  pending: boolean;
  tempId?: string; // Client-generated UUID for correlation
}

/**
 * Interface for RabbitMQ post creation message payload.
 * Sent from API Gateway to Post Service via RabbitMQ.
 */
export interface PostCreateMessage {
  userId: string;
  title: string;
  body: string;
  createdAt: string;
  tempId?: string;
}

/**
 * API Response wrapper for post operations.
 */
export interface PostResponse {
  success: boolean;
  message?: string;
  data?: Post | OptimisticPost | PostCreateMessage;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  status?: number;
}

/**
 * Interface for RabbitMQ comment creation message payload.
 * Sent from API Gateway to Comment Service via RabbitMQ.
 */
export interface CommentCreateMessage {
  postId: string;
  userId: string;
  authorUsername: string;
  authorAvatar?: string;
  body: string;
  createdAt: string;
  tempId?: string;
}

/**
 * Interface representing a Comment entity.
 */
export interface Comment {
  _id?: string;
  postId: string;
  userId: string;
  authorUsername: string;
  authorAvatar?: string;
  body: string;
  createdAt: string;
  deleted?: boolean;
  deletedAt?: string;
}

/**
 * API Response wrapper for comment operations.
 */
export interface CommentResponse {
  success: boolean;
  message?: string;
  data?: Comment;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  status?: number;
}
