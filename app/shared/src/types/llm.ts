// LLM Types - Shared between server and client
// Types for LLM API interactions, requests, and responses

/**
 * Message roles for chat-based LLM APIs
 */
export type LLMMessageRole = 'system' | 'user' | 'assistant';

/**
 * Single message in a chat conversation
 */
export interface LLMMessage {
  role: LLMMessageRole;
  content: string;
}

/**
 * Request to send to an LLM provider
 */
export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * Response from an LLM provider (normalized format)
 */
export interface LLMResponse {
  content: string;
  tokensInput: number;
  tokensOutput: number;
  responseTimeMs: number;
  finishReason: LLMFinishReason;
  rawResponse?: Record<string, unknown>;
}

/**
 * Finish reasons normalized across providers
 */
export type LLMFinishReason = 'stop' | 'length' | 'content_filter' | 'error' | 'unknown';

/**
 * Configuration for an LLM provider instance
 */
export interface LLMProviderConfig {
  providerId: string;
  apiEndpoint: string;
  apiKey: string;
  rateLimitPerMinute: number;
}

/**
 * Result of testing provider connectivity
 */
export interface LLMTestResult {
  success: boolean;
  providerId: string;
  responseTimeMs?: number;
  error?: string;
  timestamp: string;
}

/**
 * Model info returned from provider listing
 */
export interface LLMModelInfo {
  id: string;
  name?: string;
  contextLength?: number;
  pricing?: {
    inputPerMillion?: number;
    outputPerMillion?: number;
  };
}

/**
 * Retry configuration for LLM client
 */
export interface LLMRetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: LLMRetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};
