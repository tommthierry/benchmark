// LLM-specific error classes
// Provides structured error handling for LLM API interactions

/**
 * Base error class for all LLM-related errors
 */
export class LLMError extends Error {
  readonly statusCode: number;
  readonly isRetryable: boolean;

  constructor(message: string, statusCode = 500, isRetryable = false) {
    super(message);
    this.name = 'LLMError';
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
    Object.setPrototypeOf(this, LLMError.prototype);
  }
}

/**
 * Thrown when API authentication fails (401/403)
 */
export class LLMAuthError extends LLMError {
  constructor(message = 'Authentication failed') {
    super(message, 401, false);
    this.name = 'LLMAuthError';
    Object.setPrototypeOf(this, LLMAuthError.prototype);
  }
}

/**
 * Thrown when rate limited by provider (429)
 */
export class LLMRateLimitError extends LLMError {
  readonly retryAfterMs: number | null;

  constructor(message = 'Rate limit exceeded', retryAfterMs: number | null = null) {
    super(message, 429, true);
    this.name = 'LLMRateLimitError';
    this.retryAfterMs = retryAfterMs;
    Object.setPrototypeOf(this, LLMRateLimitError.prototype);
  }
}

/**
 * Thrown when request times out
 */
export class LLMTimeoutError extends LLMError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, message = 'Request timed out') {
    super(message, 408, true);
    this.name = 'LLMTimeoutError';
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, LLMTimeoutError.prototype);
  }
}

/**
 * Thrown when provider returns an error (5xx or other)
 */
export class LLMProviderError extends LLMError {
  readonly responseBody: string;
  readonly providerStatusCode: number;

  constructor(
    message: string,
    providerStatusCode: number,
    responseBody = ''
  ) {
    // 5xx errors are retryable, 4xx are not (except 429 which uses LLMRateLimitError)
    const isRetryable = providerStatusCode >= 500;
    super(message, providerStatusCode, isRetryable);
    this.name = 'LLMProviderError';
    this.providerStatusCode = providerStatusCode;
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, LLMProviderError.prototype);
  }
}

/**
 * Thrown when provider is not found or not configured
 */
export class LLMProviderNotFoundError extends LLMError {
  readonly providerId: string;

  constructor(providerId: string) {
    super(`Provider '${providerId}' not found or not configured`, 404, false);
    this.name = 'LLMProviderNotFoundError';
    this.providerId = providerId;
    Object.setPrototypeOf(this, LLMProviderNotFoundError.prototype);
  }
}

/**
 * Thrown when model is not found
 */
export class LLMModelNotFoundError extends LLMError {
  readonly modelId: string;

  constructor(modelId: string) {
    super(`Model '${modelId}' not found`, 404, false);
    this.name = 'LLMModelNotFoundError';
    this.modelId = modelId;
    Object.setPrototypeOf(this, LLMModelNotFoundError.prototype);
  }
}

/**
 * Parse error response from provider and create appropriate error
 */
export function parseProviderError(
  statusCode: number,
  responseBody: string
): LLMError {
  if (statusCode === 401 || statusCode === 403) {
    return new LLMAuthError(`Authentication failed: ${responseBody}`);
  }

  if (statusCode === 429) {
    // Try to extract retry-after from response
    let retryAfter: number | null = null;
    try {
      const parsed = JSON.parse(responseBody);
      if (parsed.error?.metadata?.['X-RateLimit-Reset']) {
        retryAfter = parseInt(parsed.error.metadata['X-RateLimit-Reset'], 10) - Date.now();
      }
    } catch {
      // Ignore parse errors
    }
    return new LLMRateLimitError(`Rate limit exceeded: ${responseBody}`, retryAfter);
  }

  return new LLMProviderError(
    `Provider error (${statusCode}): ${responseBody}`,
    statusCode,
    responseBody
  );
}
