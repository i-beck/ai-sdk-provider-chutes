import { describe, it, expect } from 'vitest';

describe('Error Classes', () => {
  it('should create ChutesError', async () => {
    const { ChutesError } = await import('../../src/api/errors');
    
    const error = new ChutesError('Test error', 'TEST_CODE', 400);
    
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ChutesError');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(400);
  });

  it('should create ChutesAPIError', async () => {
    const { ChutesAPIError } = await import('../../src/api/errors');
    
    const mockResponse = new Response('{"error": "Not found"}', {
      status: 404,
      statusText: 'Not Found',
    });
    
    const error = new ChutesAPIError(
      'API Error',
      404,
      undefined, // chuteId
      mockResponse,
      { error: 'Not found' }
    );
    
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ChutesAPIError');
    expect(error.message).toBe('API Error');
    expect(error.statusCode).toBe(404);
    expect(error.response).toBe(mockResponse);
    expect(error.responseBody).toEqual({ error: 'Not found' });
  });

  it('should handle errors with ChutesErrorHandler', async () => {
    const { ChutesErrorHandler } = await import('../../src/api/errors');
    
    const handler = new ChutesErrorHandler();
    expect(handler).toBeDefined();
  });

  it('should create API error from Response', async () => {
    const { ChutesErrorHandler } = await import('../../src/api/errors');
    
    const mockResponse = new Response(
      JSON.stringify({ error: { message: 'Invalid API key' } }), 
      {
        status: 401,
        statusText: 'Unauthorized',
      }
    );
    
    const handler = new ChutesErrorHandler();
    const error = await handler.createAPIError(mockResponse);
    
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain('Invalid API key');
  });

  it('should extract error message from response body', async () => {
    const { ChutesErrorHandler } = await import('../../src/api/errors');
    
    const mockResponse = new Response(
      JSON.stringify({ message: 'Rate limit exceeded' }), 
      {
        status: 429,
        statusText: 'Too Many Requests',
      }
    );
    
    const handler = new ChutesErrorHandler();
    const error = await handler.createAPIError(mockResponse);
    
    expect(error.message).toContain('Rate limit exceeded');
  });

  it('should handle text response bodies', async () => {
    const { ChutesErrorHandler } = await import('../../src/api/errors');
    
    const mockResponse = new Response('Internal Server Error', {
      status: 500,
      statusText: 'Internal Server Error',
    });
    
    const handler = new ChutesErrorHandler();
    const error = await handler.createAPIError(mockResponse);
    
    expect(error.statusCode).toBe(500);
    expect(error.message).toBeDefined();
  });
});

describe('Error Handler - Status Code Mapping', () => {
  it('should handle 429 rate limit errors', async () => {
    const { ChutesErrorHandler, ChutesAPIError } = await import('../../src/api/errors');
    
    const mockResponse = new Response('{"error": "Rate limit"}', {
      status: 429,
      headers: { 'retry-after': '60' },
    });
    
    const apiError = new ChutesAPIError('Rate limit exceeded', 429, undefined, mockResponse);
    const handler = new ChutesErrorHandler();
    
    try {
      handler.handleError(apiError);
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      // The error should be related to rate limiting
      expect(error).toBeDefined();
      expect(error.message).toContain('Rate limit');
    }
  });

  it('should handle 400 bad request errors', async () => {
    const { ChutesErrorHandler, ChutesAPIError } = await import('../../src/api/errors');
    
    const apiError = new ChutesAPIError('Invalid request', 400, undefined);
    const handler = new ChutesErrorHandler();
    
    try {
      handler.handleError(apiError);
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.name).toContain('InvalidArgument');
    }
  });

  it('should handle 500 server errors with retry', async () => {
    const { ChutesErrorHandler, ChutesAPIError } = await import('../../src/api/errors');
    
    const apiError = new ChutesAPIError('Server error', 500, undefined);
    const handler = new ChutesErrorHandler();
    
    try {
      handler.handleError(apiError);
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.name).toContain('APICall');
      expect(error.isRetryable).toBe(true);
    }
  });

  it('should handle fetch errors', async () => {
    const { ChutesErrorHandler } = await import('../../src/api/errors');
    
    const fetchError = new TypeError('fetch failed');
    const handler = new ChutesErrorHandler();
    
    try {
      handler.handleError(fetchError);
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.name).toContain('APICall');
      expect(error.isRetryable).toBe(true);
    }
  });
});

describe('Chute ID Tracking in Errors', () => {
  it('should include chuteId in ChutesAPIError', async () => {
    const { ChutesAPIError } = await import('../../src/api/errors');
    
    const testChuteId = '4f82321e-3e58-55da-ba44-051686ddbfe5';
    const error = new ChutesAPIError(
      'Test error',
      500,
      testChuteId
    );
    
    expect(error.chuteId).toBe(testChuteId);
  });

  it('should propagate chuteId through error handler to SDK errors', async () => {
    const { ChutesErrorHandler, ChutesAPIError } = await import('../../src/api/errors');
    
    const testChuteId = '4f82321e-3e58-55da-ba44-051686ddbfe5';
    const apiError = new ChutesAPIError('API Error', 500, testChuteId);
    const handler = new ChutesErrorHandler();
    
    try {
      handler.handleError(apiError);
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      // The chute ID should be accessible via error.cause.chuteId
      expect(error.cause).toBeDefined();
      expect(error.cause.chuteId).toBe(testChuteId);
    }
  });

  it('should include chuteId when creating API error from Response', async () => {
    const { ChutesErrorHandler } = await import('../../src/api/errors');
    
    const mockResponse = new Response('{"error": "Server error"}', {
      status: 500,
      statusText: 'Internal Server Error',
    });
    
    const testChuteId = 'abc-123-def-456';
    const handler = new ChutesErrorHandler();
    const error = await handler.createAPIError(mockResponse, testChuteId);
    
    expect(error.chuteId).toBe(testChuteId);
  });
});

