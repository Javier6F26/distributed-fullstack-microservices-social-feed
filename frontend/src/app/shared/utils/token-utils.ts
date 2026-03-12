/**
 * Token utility functions for JWT handling
 */

export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  exp: number;
  iat: number;
}

/**
 * Decode a JWT token without verification (for client-side expiry checking)
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = atob(payload);
    return JSON.parse(decoded) as JwtPayload;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Safely check if token is expired with fallback behavior
 * Returns true if token is expired, invalid, or missing expiry claim
 */
export function isTokenExpired(token: string, bufferSeconds = 30): boolean {
  const payload = decodeJwt(token);
  if (!payload) {
    return true; // Invalid token
  }

  // If no exp claim, treat as expired for security
  if (!payload.exp) {
    console.warn('JWT token missing exp claim - treating as expired');
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  const expiryWithBuffer = payload.exp - bufferSeconds;

  return now >= expiryWithBuffer;
}

/**
 * Get token expiry time in milliseconds
 */
export function getTokenExpiryTime(token: string): number | null {
  const payload = decodeJwt(token);
  if (!payload) {
    return null;
  }

  return payload.exp * 1000;
}

/**
 * Get time until token expires in milliseconds
 * Returns null if token is invalid or has no expiry claim
 */
export function getTimeUntilExpiry(token: string, bufferSeconds = 0): number | null {
  const payload = decodeJwt(token);
  if (!payload) {
    return null;
  }

  // Check if exp claim exists
  if (!payload.exp) {
    console.warn('JWT token missing exp claim - cannot determine expiry time');
    return null;
  }

  const now = Date.now();
  const expiry = payload.exp * 1000;
  const timeUntil = expiry - now - bufferSeconds * 1000;

  // If timeUntil is negative or very small, token is already expired or about to expire
  return timeUntil;
}
