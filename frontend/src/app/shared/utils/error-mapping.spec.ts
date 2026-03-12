import { getUserFriendlyMessage, generateErrorKey, ERROR_MAPPINGS } from './error-mapping';

describe('Error Mapping', () => {
  describe('generateErrorKey', () => {
    it('should return string as-is for string errors', () => {
      const error = 'Custom error message';
      expect(generateErrorKey(error)).toBe('Custom error message');
    });

    it('should generate HttpErrorResponse key for HTTP errors', () => {
      const error = { status: 401, message: 'Unauthorized' };
      expect(generateErrorKey(error)).toBe('HttpErrorResponse:401');
    });

    it('should generate HttpErrorResponse key for 500 errors', () => {
      const error = { status: 500, message: 'Internal Server Error' };
      expect(generateErrorKey(error)).toBe('HttpErrorResponse:500');
    });

    it('should generate name:message key for standard Error objects', () => {
      const error = new Error('Something went wrong');
      expect(generateErrorKey(error)).toBe('Error:Something went wrong');
    });

    it('should return generic for unknown error types', () => {
      const error = { custom: 'field' };
      expect(generateErrorKey(error)).toBe('generic');
    });

    it('should return generic for null/undefined', () => {
      expect(generateErrorKey(null)).toBe('generic');
      expect(generateErrorKey(undefined)).toBe('generic');
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return connection error message for status 0', () => {
      const error = { status: 0 };
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('Unable to connect');
      expect(message).toContain('check your internet connection');
    });

    it('should return session expired message for 401', () => {
      const error = { status: 401 };
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('session has expired');
      expect(message).toContain('log in again');
    });

    it('should return permission message for 403', () => {
      const error = { status: 403 };
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('permission');
      expect(message).toContain('Contact support');
    });

    it('should return not found message for 404', () => {
      const error = { status: 404 };
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('not found');
      expect(message).toContain('moved or deleted');
    });

    it('should return rate limit message for 429', () => {
      const error = { status: 429 };
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('Too many requests');
      expect(message).toContain('wait a moment');
    });

    it('should return server error message for 500', () => {
      const error = { status: 500 };
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('internal server error');
      expect(message).toContain('try again later');
    });

    it('should return server unavailable message for 503', () => {
      const error = { status: 503 };
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('temporarily unavailable');
      expect(message).toContain('wait a moment');
    });

    it('should return generic message for unknown errors', () => {
      const error = { custom: 'error' };
      const message = getUserFriendlyMessage(error);
      expect(message).toBe('Something went wrong. Please try again.');
    });

    it('should return message as-is for string errors', () => {
      const errorMessage = 'Custom error message';
      const message = getUserFriendlyMessage(errorMessage);
      expect(message).toBe('Custom error message');
    });
  });

  describe('ERROR_MAPPINGS', () => {
    it('should have all required error mappings', () => {
      expect(ERROR_MAPPINGS['HttpErrorResponse:0']).toBeDefined();
      expect(ERROR_MAPPINGS['HttpErrorResponse:401']).toBeDefined();
      expect(ERROR_MAPPINGS['HttpErrorResponse:403']).toBeDefined();
      expect(ERROR_MAPPINGS['HttpErrorResponse:404']).toBeDefined();
      expect(ERROR_MAPPINGS['HttpErrorResponse:429']).toBeDefined();
      expect(ERROR_MAPPINGS['HttpErrorResponse:500']).toBeDefined();
      expect(ERROR_MAPPINGS['HttpErrorResponse:502']).toBeDefined();
      expect(ERROR_MAPPINGS['HttpErrorResponse:503']).toBeDefined();
      expect(ERROR_MAPPINGS['generic']).toBeDefined();
    });

    it('should have message and action for each mapping', () => {
      Object.values(ERROR_MAPPINGS).forEach(mapping => {
        expect(mapping).toHaveProperty('message');
        expect(mapping).toHaveProperty('action');
        expect(typeof mapping.message).toBe('string');
        expect(typeof mapping.action).toBe('string');
      });
    });
  });
});
