// Provider Manager - Manages LLM provider instances and clients
// Responsible for initializing providers from database and providing access

import { eq } from 'drizzle-orm';
import type { LLMResponse, LLMProviderConfig } from '@sabe/shared';
import { db, schema, type Provider } from '../../db/index.js';
import type { ILLMProvider } from './base-provider.js';
import { OpenRouterProvider } from './openrouter-provider.js';
import { LLMClient } from './llm-client.js';
import { getRateLimiter } from './rate-limiter.js';
import { LLMProviderNotFoundError } from './errors.js';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

/**
 * Manages LLM provider instances and clients
 * Initializes from database and caches active providers
 */
export class ProviderManager {
  private providers: Map<string, ILLMProvider> = new Map();
  private clients: Map<string, LLMClient> = new Map();
  private initialized = false;

  /**
   * Initialize providers from database
   * Only loads active providers with valid API keys
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.debug('Provider manager already initialized');
      return;
    }

    const activeProviders = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.status, 'active'));

    logger.info({
      count: activeProviders.length,
    }, 'Loading active providers');

    for (const provider of activeProviders) {
      await this.registerProvider(provider);
    }

    this.initialized = true;
    logger.info({
      registeredCount: this.providers.size,
    }, 'Provider manager initialized');
  }

  /**
   * Register a provider from database record
   */
  private async registerProvider(dbProvider: Provider): Promise<void> {
    const apiKey = process.env[dbProvider.apiKeyEnvVar];

    if (!apiKey) {
      logger.warn({
        provider: dbProvider.name,
        envVar: dbProvider.apiKeyEnvVar,
      }, 'API key not found in environment, skipping provider');
      return;
    }

    const config: LLMProviderConfig = {
      providerId: dbProvider.id,
      apiEndpoint: dbProvider.apiEndpoint,
      apiKey,
      rateLimitPerMinute: dbProvider.rateLimitPerMinute ?? 60,
    };

    // Create provider instance based on endpoint detection
    let provider: ILLMProvider;

    if (dbProvider.apiEndpoint.includes('openrouter.ai')) {
      provider = new OpenRouterProvider(config);
    } else {
      // Default to OpenRouter-compatible provider (OpenAI API format)
      logger.debug({
        provider: dbProvider.name,
        endpoint: dbProvider.apiEndpoint,
      }, 'Using OpenRouter-compatible client for unknown provider');
      provider = new OpenRouterProvider(config);
    }

    // Create rate limiter and client
    const rateLimiter = getRateLimiter(
      dbProvider.id,
      dbProvider.rateLimitPerMinute ?? 60
    );
    const client = new LLMClient(provider, rateLimiter);

    this.providers.set(dbProvider.id, provider);
    this.clients.set(dbProvider.id, client);

    logger.info({
      provider: dbProvider.name,
      id: dbProvider.id,
      rateLimitPerMinute: dbProvider.rateLimitPerMinute ?? 60,
    }, 'Provider registered');
  }

  /**
   * Get a provider by ID
   */
  getProvider(providerId: string): ILLMProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get a client by provider ID
   */
  getClient(providerId: string): LLMClient | undefined {
    return this.clients.get(providerId);
  }

  /**
   * Get a client by provider ID, throwing if not found
   */
  getClientOrThrow(providerId: string): LLMClient {
    const client = this.clients.get(providerId);
    if (!client) {
      throw new LLMProviderNotFoundError(providerId);
    }
    return client;
  }

  /**
   * Send a prompt through a specific provider
   */
  async sendPrompt(
    providerId: string,
    model: string,
    prompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LLMResponse> {
    const client = this.getClientOrThrow(providerId);
    return client.sendPrompt(model, prompt, options);
  }

  /**
   * Test provider connectivity
   */
  async testProvider(providerId: string): Promise<boolean> {
    const client = this.clients.get(providerId);
    if (!client) {
      return false;
    }
    return client.testConnection();
  }

  /**
   * List models from a provider
   */
  async listProviderModels(providerId: string) {
    const client = this.getClientOrThrow(providerId);
    return client.listModels();
  }

  /**
   * Reload a specific provider (e.g., after config change)
   */
  async reloadProvider(providerId: string): Promise<void> {
    // Remove existing
    this.providers.delete(providerId);
    this.clients.delete(providerId);

    // Reload from database
    const [dbProvider] = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.id, providerId));

    if (dbProvider && dbProvider.status === 'active') {
      await this.registerProvider(dbProvider);
    }
  }

  /**
   * Get all registered provider IDs
   */
  getRegisteredProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   */
  isProviderRegistered(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  /**
   * Reset manager state (useful for testing)
   */
  reset(): void {
    this.providers.clear();
    this.clients.clear();
    this.initialized = false;
  }
}

// Singleton instance
let providerManagerInstance: ProviderManager | null = null;

/**
 * Get the singleton provider manager instance
 * Initializes on first call
 */
export async function getProviderManager(): Promise<ProviderManager> {
  if (!providerManagerInstance) {
    providerManagerInstance = new ProviderManager();
    await providerManagerInstance.initialize();
  }
  return providerManagerInstance;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetProviderManager(): void {
  if (providerManagerInstance) {
    providerManagerInstance.reset();
    providerManagerInstance = null;
  }
}
