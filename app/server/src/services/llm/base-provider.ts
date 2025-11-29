// Base Provider Interface
// Defines the contract that all LLM providers must implement

import type {
  LLMRequest,
  LLMResponse,
  LLMProviderConfig,
  LLMModelInfo,
} from '@sabe/shared';

/**
 * Interface that all LLM provider implementations must follow
 */
export interface ILLMProvider {
  /** Provider name (e.g., "OpenRouter") */
  readonly name: string;

  /** Provider configuration */
  readonly config: LLMProviderConfig;

  /**
   * Send a request to the LLM API
   * @param request The request payload
   * @returns The normalized response
   * @throws LLMError on failure
   */
  sendRequest(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Test connectivity to the provider
   * @returns true if connection is successful
   */
  testConnection(): Promise<boolean>;

  /**
   * List available models from the provider
   * @returns Array of model information
   */
  listModels(): Promise<LLMModelInfo[]>;
}

/**
 * Base class providing common functionality for providers
 */
export abstract class BaseLLMProvider implements ILLMProvider {
  abstract readonly name: string;
  readonly config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  abstract sendRequest(request: LLMRequest): Promise<LLMResponse>;
  abstract testConnection(): Promise<boolean>;
  abstract listModels(): Promise<LLMModelInfo[]>;

  /**
   * Build authorization header
   */
  protected getAuthHeader(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
    };
  }

  /**
   * Build common headers for API requests
   */
  protected getCommonHeaders(): Record<string, string> {
    return {
      ...this.getAuthHeader(),
      'Content-Type': 'application/json',
    };
  }
}
