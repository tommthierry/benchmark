// LLM Client - Wrapper with retry logic and error handling
// Provides resilient LLM API calls with exponential backoff

import type {
  LLMRequest,
  LLMResponse,
  LLMRetryConfig,
  DEFAULT_RETRY_CONFIG,
} from '@sabe/shared';
import type { ILLMProvider } from './base-provider.js';
import {
  LLMError,
  LLMAuthError,
  LLMRateLimitError,
} from './errors.js';
import { RateLimiter } from './rate-limiter.js';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

/**
 * LLM Client with retry logic, rate limiting, and error handling
 */
export class LLMClient {
  private readonly provider: ILLMProvider;
  private readonly rateLimiter: RateLimiter;
  private readonly retryConfig: LLMRetryConfig;

  constructor(
    provider: ILLMProvider,
    rateLimiter: RateLimiter,
    retryConfig?: Partial<LLMRetryConfig>
  ) {
    this.provider = provider;
    this.rateLimiter = rateLimiter;
    this.retryConfig = {
      maxRetries: retryConfig?.maxRetries ?? 3,
      initialDelayMs: retryConfig?.initialDelayMs ?? 1000,
      maxDelayMs: retryConfig?.maxDelayMs ?? 30000,
      backoffMultiplier: retryConfig?.backoffMultiplier ?? 2,
    };
  }

  /**
   * Get the provider name
   */
  get providerName(): string {
    return this.provider.name;
  }

  /**
   * Send a simple prompt (creates single user message)
   */
  async sendPrompt(
    model: string,
    prompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LLMResponse> {
    const request: LLMRequest = {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    };

    return this.sendRequest(request);
  }

  /**
   * Send a full request with messages
   */
  async sendRequest(request: LLMRequest): Promise<LLMResponse> {
    // Wait for rate limiter
    await this.rateLimiter.acquire(this.provider.config.providerId);

    return this.sendWithRetry(request);
  }

  /**
   * Send request with exponential backoff retry
   */
  private async sendWithRetry(request: LLMRequest): Promise<LLMResponse> {
    let lastError: Error | null = null;
    let delay = this.retryConfig.initialDelayMs;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        logger.debug({
          attempt: attempt + 1,
          maxRetries: this.retryConfig.maxRetries + 1,
          model: request.model,
          provider: this.provider.name,
        }, 'Attempting LLM request');

        const response = await this.provider.sendRequest(request);

        if (attempt > 0) {
          logger.info({
            model: request.model,
            provider: this.provider.name,
            attempts: attempt + 1,
          }, 'LLM request succeeded after retry');
        }

        return response;
      } catch (error) {
        lastError = error as Error;

        // Don't retry auth errors - they won't succeed
        if (error instanceof LLMAuthError) {
          logger.error({
            provider: this.provider.name,
            error: error.message,
          }, 'Authentication error - not retrying');
          throw error;
        }

        // Check if error is retryable
        const isRetryable = error instanceof LLMError && error.isRetryable;

        if (!isRetryable) {
          logger.warn({
            provider: this.provider.name,
            error: lastError.message,
          }, 'Non-retryable error');
          throw error;
        }

        // Check if we have retries left
        if (attempt < this.retryConfig.maxRetries) {
          // Special handling for rate limit with retry-after
          let waitTime = delay;
          if (error instanceof LLMRateLimitError && error.retryAfterMs) {
            waitTime = Math.max(error.retryAfterMs, delay);
          }

          // Add jitter to prevent thundering herd (0-1 second random)
          const jitter = Math.random() * 1000;
          waitTime = Math.min(waitTime + jitter, this.retryConfig.maxDelayMs);

          logger.warn({
            attempt: attempt + 1,
            maxRetries: this.retryConfig.maxRetries + 1,
            waitTimeMs: Math.ceil(waitTime),
            error: lastError.message,
            model: request.model,
          }, 'LLM request failed, retrying');

          await this.sleep(waitTime);

          // Exponential backoff for next attempt
          delay = Math.min(
            delay * this.retryConfig.backoffMultiplier,
            this.retryConfig.maxDelayMs
          );
        }
      }
    }

    logger.error({
      model: request.model,
      provider: this.provider.name,
      attempts: this.retryConfig.maxRetries + 1,
      error: lastError?.message,
    }, 'LLM request failed after all retries');

    throw lastError;
  }

  /**
   * Test provider connectivity
   */
  async testConnection(): Promise<boolean> {
    return this.provider.testConnection();
  }

  /**
   * List available models
   */
  async listModels() {
    return this.provider.listModels();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
