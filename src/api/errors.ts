import {
  APICallError,
  InvalidResponseDataError,
  InvalidArgumentError,
} from '@ai-sdk/provider';

export class ChutesError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ChutesError';
  }
}

export class ChutesAPIError extends ChutesError {
  constructor(
    message: string,
    public statusCode: number,
    public chuteId?: string,
    public response?: Response,
    public responseBody?: any
  ) {
    super(message, undefined, statusCode);
    this.name = 'ChutesAPIError';
  }
}

export class ChutesErrorHandler {
  handleError(error: unknown): never {
    // Handle Response objects
    if (error instanceof Response) {
      throw this.createAPIError(error);
    }

    // Handle fetch errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new APICallError({
        message: 'Network error: Unable to reach Chutes API',
        url: '',
        requestBodyValues: {},
        cause: error,
        isRetryable: true,
      });
    }

    // Handle known error types
    if (error instanceof ChutesAPIError) {
      throw this.mapToSDKError(error);
    }

    // Re-throw unknown errors
    throw error;
  }

  async createAPIError(response: Response, chuteId?: string): Promise<ChutesAPIError> {
    let responseBody;
    try {
      const text = await response.text();
      try {
        responseBody = JSON.parse(text);
      } catch {
        responseBody = text;
      }
    } catch {
      responseBody = null;
    }

    const message =
      this.extractErrorMessage(responseBody) ??
      `API request failed with status ${response.status}`;

    return new ChutesAPIError(message, response.status, chuteId, response, responseBody);
  }

  private extractErrorMessage(body: any): string | undefined {
    if (typeof body === 'string') return body;
    if (body?.error?.message) return body.error.message;
    if (body?.message) return body.message;
    if (body?.error) return String(body.error);
    return undefined;
  }

  private mapToSDKError(error: ChutesAPIError): never {
    const status = error.statusCode;
    const message = error.message;
    const url = error.response?.url ?? '';

    // Rate limiting
    if (status === 429) {
      throw new APICallError({
        message: `Rate limit exceeded: ${message}`,
        url,
        requestBodyValues: {},
        statusCode: status,
        cause: error,
        isRetryable: true,
      });
    }

    // Invalid request
    if (status === 400) {
      throw new InvalidArgumentError({
        argument: 'request',
        message,
        cause: error,
      });
    }

    // Invalid API key
    if (status === 401) {
      throw new APICallError({
        message: `Authentication failed: ${message}`,
        url,
        requestBodyValues: {},
        statusCode: status,
        cause: error,
        isRetryable: false,
      });
    }

    // Server errors
    if (status && status >= 500) {
      throw new APICallError({
        message,
        url,
        requestBodyValues: {},
        statusCode: status,
        cause: error,
        isRetryable: true,
      });
    }

    // Client errors
    if (status && status >= 400) {
      throw new APICallError({
        message,
        url,
        requestBodyValues: {},
        statusCode: status,
        cause: error,
        isRetryable: false,
      });
    }

    // Default
    throw new APICallError({
      message,
      url,
      requestBodyValues: {},
      cause: error,
      isRetryable: false,
    });
  }

  private getRetryAfter(response?: Response): number | undefined {
    if (!response) return undefined;

    const retryAfterHeader = response.headers.get('retry-after');
    if (!retryAfterHeader) return undefined;

    // Parse as seconds
    const retryAfterSeconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(retryAfterSeconds)) {
      return retryAfterSeconds * 1000; // Convert to milliseconds
    }

    // Parse as date
    const retryAfterDate = new Date(retryAfterHeader);
    if (!isNaN(retryAfterDate.getTime())) {
      return retryAfterDate.getTime() - Date.now();
    }

    return undefined;
  }
}

