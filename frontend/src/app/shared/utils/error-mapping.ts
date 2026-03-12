/**
 * Error Mapping for User-Friendly Messages
 * Maps technical error codes to user-friendly messages with actionable guidance
 */

export interface ErrorMapping {
  message: string;
  action: string;
}

/**
 * Standard error mappings for common HTTP and application errors
 */
export const ERROR_MAPPINGS: Record<string, ErrorMapping> = {
  // Network errors
  'HttpErrorResponse:0': {
    message: 'Unable to connect to the server.',
    action: 'Please check your internet connection and try again.'
  },
  
  // Authentication errors
  'HttpErrorResponse:401': {
    message: 'Your session has expired.',
    action: 'Please log in again to continue.'
  },
  'HttpErrorResponse:403': {
    message: 'You do not have permission to access this resource.',
    action: 'Contact support if you believe this is an error.'
  },
  
  // Client errors
  'HttpErrorResponse:400': {
    message: 'Invalid request.',
    action: 'Please check your input and try again.'
  },
  'HttpErrorResponse:404': {
    message: 'The requested resource was not found.',
    action: 'The page or item may have been moved or deleted.'
  },
  'HttpErrorResponse:409': {
    message: 'Conflict detected.',
    action: 'The resource has been modified. Please refresh and try again.'
  },
  'HttpErrorResponse:429': {
    message: 'Too many requests.',
    action: 'Please wait a moment and try again.'
  },
  
  // Server errors
  'HttpErrorResponse:500': {
    message: 'An internal server error occurred.',
    action: 'Please try again later.'
  },
  'HttpErrorResponse:502': {
    message: 'The server is temporarily unavailable.',
    action: 'Please wait a moment and try again.'
  },
  'HttpErrorResponse:503': {
    message: 'The service is temporarily unavailable.',
    action: 'Please wait a moment and try again.'
  },
  'HttpErrorResponse:504': {
    message: 'The server took too long to respond.',
    action: 'Please try again later.'
  },
  
  // Generic fallback
  'generic': {
    message: 'Something went wrong.',
    action: 'Please try again.'
  }
};

/**
 * Get user-friendly error message with actionable guidance
 * @param error - The error object or string
 * @returns Formatted message: "What happened + What you can do"
 */
export function getUserFriendlyMessage(error: unknown): string {
  const key = generateErrorKey(error);
  const mapping = ERROR_MAPPINGS[key];
  
  if (mapping) {
    return `${mapping.message} ${mapping.action}`;
  }
  
  // Return generic fallback
  return ERROR_MAPPINGS['generic'].message + ' ' + ERROR_MAPPINGS['generic'].action;
}

/**
 * Generate a unique key for error deduplication
 * @param error - The error object or string
 * @returns Unique error key
 */
export function generateErrorKey(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;

    // HTTP error response
    if ('status' in err && typeof err['status'] === 'number') {
      return `HttpErrorResponse:${err['status']}`;
    }

    // Standard Error object
    if ('name' in err && 'message' in err) {
      return `${err['name']}:${String(err['message'])}`;
    }
  }

  // Fallback to generic
  return 'generic';
}
