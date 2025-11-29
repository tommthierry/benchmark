// LLM Services Module - Public API
// Re-exports all LLM-related services and types

// Provider Manager (main entry point)
export {
  ProviderManager,
  getProviderManager,
  resetProviderManager,
} from './provider-manager.js';

// LLM Client
export { LLMClient } from './llm-client.js';

// Provider implementations
export { OpenRouterProvider } from './openrouter-provider.js';
export type { ILLMProvider } from './base-provider.js';
export { BaseLLMProvider } from './base-provider.js';

// Rate Limiting
export {
  RateLimiter,
  getRateLimiter,
  clearRateLimiters,
} from './rate-limiter.js';

// Errors
export {
  LLMError,
  LLMAuthError,
  LLMRateLimitError,
  LLMTimeoutError,
  LLMProviderError,
  LLMProviderNotFoundError,
  LLMModelNotFoundError,
  parseProviderError,
} from './errors.js';
