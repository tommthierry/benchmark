// OpenRouter Provider Implementation
// Implements the ILLMProvider interface for OpenRouter API
// API Reference: https://openrouter.ai/docs/api/reference/overview

import type {
  LLMRequest,
  LLMResponse,
  LLMProviderConfig,
  LLMModelInfo,
  LLMFinishReason,
} from '@sabe/shared';
import { BaseLLMProvider } from './base-provider.js';
import { parseProviderError, LLMTimeoutError } from './errors.js';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

// OpenRouter API response types
interface OpenRouterMessage {
  role: string;
  content: string;
}

interface OpenRouterChoice {
  message: OpenRouterMessage;
  finish_reason: string;
}

interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenRouterChatResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage?: OpenRouterUsage;
}

interface OpenRouterModel {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

// Default request timeout (2 minutes)
const DEFAULT_TIMEOUT_MS = 120000;

/**
 * OpenRouter API provider implementation
 * Supports chat completions and model listing
 */
export class OpenRouterProvider extends BaseLLMProvider {
  readonly name = 'OpenRouter';

  constructor(config: LLMProviderConfig) {
    super(config);
  }

  /**
   * Get OpenRouter-specific headers
   * OpenRouter recommends HTTP-Referer and X-Title for attribution
   */
  protected override getCommonHeaders(): Record<string, string> {
    return {
      ...super.getCommonHeaders(),
      'HTTP-Referer': 'https://sabe.local',
      'X-Title': 'SABE Benchmark',
    };
  }

  /**
   * Send a chat completion request to OpenRouter
   */
  async sendRequest(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const endpoint = `${this.config.apiEndpoint}/chat/completions`;

    logger.debug({
      model: request.model,
      messageCount: request.messages.length,
      endpoint,
    }, 'Sending request to OpenRouter');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.getCommonHeaders(),
        body: JSON.stringify({
          model: request.model,
          messages: request.messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 1000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;

      if (!response.ok) {
        const errorBody = await response.text();
        logger.warn({
          statusCode: response.status,
          model: request.model,
          responseTimeMs,
        }, 'OpenRouter request failed');
        throw parseProviderError(response.status, errorBody);
      }

      const data = await response.json() as OpenRouterChatResponse;

      const result: LLMResponse = {
        content: data.choices[0]?.message?.content ?? '',
        tokensInput: data.usage?.prompt_tokens ?? 0,
        tokensOutput: data.usage?.completion_tokens ?? 0,
        responseTimeMs,
        finishReason: this.mapFinishReason(data.choices[0]?.finish_reason),
        rawResponse: data as unknown as Record<string, unknown>,
      };

      logger.debug({
        model: request.model,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        responseTimeMs,
        finishReason: result.finishReason,
      }, 'OpenRouter request completed');

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new LLMTimeoutError(
          DEFAULT_TIMEOUT_MS,
          `Request to ${request.model} timed out after ${DEFAULT_TIMEOUT_MS}ms`
        );
      }

      throw error;
    }
  }

  /**
   * Test connectivity by fetching the models endpoint
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/models`, {
        method: 'GET',
        headers: this.getAuthHeader(),
      });
      return response.ok;
    } catch (error) {
      logger.warn({ error }, 'OpenRouter connection test failed');
      return false;
    }
  }

  /**
   * List all available models from OpenRouter
   */
  async listModels(): Promise<LLMModelInfo[]> {
    const response = await fetch(`${this.config.apiEndpoint}/models`, {
      method: 'GET',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw parseProviderError(response.status, errorBody);
    }

    const data = await response.json() as OpenRouterModelsResponse;

    return data.data.map(model => ({
      id: model.id,
      name: model.name,
      contextLength: model.context_length,
      pricing: model.pricing ? {
        inputPerMillion: model.pricing.prompt
          ? parseFloat(model.pricing.prompt) * 1_000_000
          : undefined,
        outputPerMillion: model.pricing.completion
          ? parseFloat(model.pricing.completion) * 1_000_000
          : undefined,
      } : undefined,
    }));
  }

  /**
   * Map OpenRouter finish reason to normalized value
   */
  private mapFinishReason(reason: string | undefined): LLMFinishReason {
    if (!reason) return 'unknown';

    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      case 'error':
        return 'error';
      default:
        return 'unknown';
    }
  }
}
