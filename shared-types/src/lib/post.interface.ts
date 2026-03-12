/**
 * Interface representing a Post entity.
 * Used across API Gateway, Post Service, and Frontend for type safety.
 */
export interface Post {
  _id?: string;
  authorId: string;
  author: string;
  title: string;
  body: string;
  createdAt: Date | string;
  commentCount: number;
  deleted?: boolean;
  deletedAt?: Date | string;
  authorDeleted?: boolean;
  authorDeletedAt?: Date | string;
  recentComments?: any[];
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
  author: string;
  title: string;
  body: string;
  createdAt: Date | string;
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
  name: string;
  email: string;
  body: string;
  createdAt: Date | string;
  tempId?: string;
}

/**
 * Interface representing a Comment entity.
 */
export interface Comment {
  _id?: string;
  postId: string;
  name: string;
  email: string;
  body: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
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
