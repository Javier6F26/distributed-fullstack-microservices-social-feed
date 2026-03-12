/**
 * Rate limiting constants for API Gateway.
 * Used by ThrottlerModule to configure rate limits.
 */

// General endpoints: 100 requests per 60 seconds
export const DEFAULT_TTL = 60000; // 60 seconds in milliseconds
export const DEFAULT_LIMIT = 100; // 100 requests

// Authenticated endpoints: 10 requests per 60 seconds
export const AUTH_TTL = 60000; // 60 seconds
export const AUTH_LIMIT = 10; // 10 requests

// Environment variable keys
export const RATE_LIMIT_TTL_KEY = 'RATE_LIMIT_TTL';
export const RATE_LIMIT_MAX_KEY = 'RATE_LIMIT_MAX';
export const RATE_LIMIT_AUTH_TTL_KEY = 'RATE_LIMIT_AUTH_TTL';
export const RATE_LIMIT_AUTH_MAX_KEY = 'RATE_LIMIT_AUTH_MAX';

// Response headers
export const RATE_LIMIT_LIMIT_HEADER = 'X-RateLimit-Limit';
export const RATE_LIMIT_REMAINING_HEADER = 'X-RateLimit-Remaining';
export const RATE_LIMIT_RESET_HEADER = 'X-RateLimit-Reset';
export const RETRY_AFTER_HEADER = 'Retry-After';
