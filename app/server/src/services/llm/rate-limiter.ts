// Rate Limiter - Token bucket implementation for LLM API calls
// Provides per-provider rate limiting with configurable limits

import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

/**
 * Token bucket entry tracking available tokens and last refill time
 */
interface TokenBucket {
  tokens: number;
  lastRefillTime: number;
}

/**
 * Rate limiter using token bucket algorithm
 * - Tokens are consumed for each request
 * - Tokens refill gradually over time
 * - Requests wait if no tokens available
 */
export class RateLimiter {
  private readonly maxTokens: number;
  private readonly refillRatePerSecond: number;
  private readonly buckets: Map<string, TokenBucket> = new Map();

  /**
   * Create a rate limiter
   * @param requestsPerMinute Maximum requests allowed per minute
   */
  constructor(requestsPerMinute: number) {
    this.maxTokens = requestsPerMinute;
    this.refillRatePerSecond = requestsPerMinute / 60;
  }

  /**
   * Acquire a token for a request, waiting if necessary
   * @param key Unique identifier (e.g., provider ID)
   */
  async acquire(key: string): Promise<void> {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    // Initialize bucket if not exists
    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefillTime: now };
      this.buckets.set(key, bucket);
    }

    // Calculate tokens to refill based on elapsed time
    const elapsedSeconds = (now - bucket.lastRefillTime) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRatePerSecond;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefillTime = now;

    // Check if we need to wait
    if (bucket.tokens < 1) {
      const waitTimeMs = ((1 - bucket.tokens) / this.refillRatePerSecond) * 1000;

      logger.debug({
        key,
        waitTimeMs: Math.ceil(waitTimeMs),
        currentTokens: bucket.tokens.toFixed(2),
      }, 'Rate limit reached, waiting for token');

      await this.sleep(waitTimeMs);

      // After waiting, we should have at least 1 token
      bucket.tokens = 1;
      bucket.lastRefillTime = Date.now();
    }

    // Consume a token
    bucket.tokens -= 1;
  }

  /**
   * Get remaining tokens for a key (for informational purposes)
   */
  getRemaining(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket) return this.maxTokens;

    const now = Date.now();
    const elapsedSeconds = (now - bucket.lastRefillTime) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRatePerSecond;
    return Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
  }

  /**
   * Check if a request can proceed immediately
   */
  canProceed(key: string): boolean {
    return this.getRemaining(key) >= 1;
  }

  /**
   * Reset the bucket for a key (useful for testing)
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton registry for rate limiters per provider
const limiterRegistry: Map<string, RateLimiter> = new Map();

/**
 * Get or create a rate limiter for a provider
 * @param providerId Provider unique identifier
 * @param requestsPerMinute Rate limit in requests per minute
 */
export function getRateLimiter(
  providerId: string,
  requestsPerMinute: number
): RateLimiter {
  const key = `${providerId}:${requestsPerMinute}`;
  let limiter = limiterRegistry.get(key);

  if (!limiter) {
    limiter = new RateLimiter(requestsPerMinute);
    limiterRegistry.set(key, limiter);
    logger.debug({
      providerId,
      requestsPerMinute,
    }, 'Created new rate limiter');
  }

  return limiter;
}

/**
 * Clear all rate limiters (useful for testing)
 */
export function clearRateLimiters(): void {
  limiterRegistry.clear();
}
