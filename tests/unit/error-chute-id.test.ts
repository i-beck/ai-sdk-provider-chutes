import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChutesAPIError, ChutesErrorHandler } from '../../src/api/errors';

describe('Error chuteId Tracking', () => {
  let errorHandler: ChutesErrorHandler;

  beforeEach(() => {
    errorHandler = new ChutesErrorHandler();
  });

  describe('ChutesAPIError', () => {
    it('should store chuteId when provided', () => {
      const error = new ChutesAPIError(
        'Test error',
        500,
        '4f82321e-3e58-55da-ba44-051686ddbfe5'
      );

      expect(error.chuteId).toBe('4f82321e-3e58-55da-ba44-051686ddbfe5');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
    });

    it('should allow chuteId to be undefined', () => {
      const error = new ChutesAPIError('Test error', 400);

      expect(error.chuteId).toBeUndefined();
    });
  });

  describe('createAPIError', () => {
    it('should include chuteId in created error', async () => {
      const mockResponse = new Response(
        JSON.stringify({ error: 'Something went wrong' }),
        {
          status: 500,
          statusText: 'Internal Server Error',
        }
      );

      const chuteId = 'test-chute-uuid-123';
      const error = await errorHandler.createAPIError(mockResponse, chuteId);

      expect(error).toBeInstanceOf(ChutesAPIError);
      expect(error.chuteId).toBe(chuteId);
      expect(error.statusCode).toBe(500);
    });

    it('should work without chuteId', async () => {
      const mockResponse = new Response(
        JSON.stringify({ error: 'Something went wrong' }),
        {
          status: 500,
        }
      );

      const error = await errorHandler.createAPIError(mockResponse);

      expect(error).toBeInstanceOf(ChutesAPIError);
      expect(error.chuteId).toBeUndefined();
    });
  });

  describe('SDK Error Mapping', () => {
    it('should preserve chuteId when mapping to SDK errors', () => {
      const chuteId = 'test-uuid-456';
      const apiError = new ChutesAPIError(
        'Rate limit exceeded',
        429,
        chuteId,
        new Response('', { status: 429, statusText: 'Too Many Requests' })
      );

      try {
        errorHandler.handleError(apiError);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        // The error should be wrapped, but chuteId should be in the cause
        expect(error.cause).toBeInstanceOf(ChutesAPIError);
        expect(error.cause.chuteId).toBe(chuteId);
      }
    });
  });
});

