// LLM API Routes
// Endpoints for testing LLM connectivity and making test calls

import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { getProviderManager, LLMError } from '../services/llm/index.js';
import { testPromptSchema } from '@sabe/shared';

const router = Router();

// POST /api/llm/test - Test LLM with a prompt
router.post('/test', async (req, res, next) => {
  try {
    const parsed = testPromptSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const { providerId, modelId, model, prompt, temperature, maxTokens } = parsed.data;

    // Determine which model to use:
    // 1. Direct model string (e.g., "x-ai/grok-4.1-fast:free")
    // 2. modelId lookup from database
    // 3. Default free model
    let providerModelId: string | undefined = model;
    let targetProviderId = providerId;

    if (!providerModelId && modelId) {
      const [dbModel] = await db
        .select()
        .from(schema.models)
        .where(eq(schema.models.id, modelId));

      if (!dbModel) {
        return res.status(404).json({ error: 'Model not found' });
      }

      targetProviderId = dbModel.providerId;
      providerModelId = dbModel.providerModelId;
    }

    // Verify provider exists
    const [provider] = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.id, targetProviderId));

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const manager = await getProviderManager();

    // Use specified model or default to a free model
    const modelToUse = providerModelId || 'meta-llama/llama-3.2-3b-instruct:free';

    const response = await manager.sendPrompt(
      targetProviderId,
      modelToUse,
      prompt,
      { temperature, maxTokens }
    );

    res.json({
      data: {
        content: response.content,
        tokensInput: response.tokensInput,
        tokensOutput: response.tokensOutput,
        responseTimeMs: response.responseTimeMs,
        finishReason: response.finishReason,
        model: modelToUse,
        providerId: targetProviderId,
      },
    });
  } catch (error) {
    // Handle LLM-specific errors with appropriate status codes
    if (error instanceof LLMError) {
      return res.status(error.statusCode).json({
        error: error.message,
        errorType: error.name,
      });
    }
    next(error);
  }
});

// GET /api/llm/providers/:id/test - Test provider connectivity
router.get('/providers/:id/test', async (req, res, next) => {
  try {
    const providerId = req.params.id;

    // Verify provider exists in database
    const [provider] = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.id, providerId));

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const manager = await getProviderManager();
    const startTime = Date.now();
    const connected = await manager.testProvider(providerId);
    const responseTimeMs = Date.now() - startTime;

    res.json({
      data: {
        providerId,
        providerName: provider.name,
        connected,
        responseTimeMs,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/llm/providers/:id/models - List available models from provider
router.get('/providers/:id/models', async (req, res, next) => {
  try {
    const providerId = req.params.id;

    // Verify provider exists
    const [provider] = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.id, providerId));

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const manager = await getProviderManager();

    if (!manager.isProviderRegistered(providerId)) {
      return res.status(400).json({
        error: 'Provider not active or API key not configured',
        details: `Check that ${provider.apiKeyEnvVar} environment variable is set`,
      });
    }

    const models = await manager.listProviderModels(providerId);

    res.json({
      data: {
        providerId,
        providerName: provider.name,
        models,
        count: models.length,
      },
    });
  } catch (error) {
    if (error instanceof LLMError) {
      return res.status(error.statusCode).json({
        error: error.message,
        errorType: error.name,
      });
    }
    next(error);
  }
});

// GET /api/llm/status - Get status of all registered providers
router.get('/status', async (_req, res, next) => {
  try {
    const manager = await getProviderManager();
    const registeredIds = manager.getRegisteredProviderIds();

    // Get provider details from database
    const providers = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.status, 'active'));

    const status = providers.map(provider => ({
      id: provider.id,
      name: provider.name,
      registered: registeredIds.includes(provider.id),
      apiEndpoint: provider.apiEndpoint,
      rateLimitPerMinute: provider.rateLimitPerMinute,
    }));

    res.json({
      data: {
        providers: status,
        totalActive: providers.length,
        totalRegistered: registeredIds.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/llm/providers/:id/reload - Reload a provider (after config change)
router.post('/providers/:id/reload', async (req, res, next) => {
  try {
    const providerId = req.params.id;

    // Verify provider exists
    const [provider] = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.id, providerId));

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const manager = await getProviderManager();
    await manager.reloadProvider(providerId);

    res.json({
      data: {
        providerId,
        providerName: provider.name,
        registered: manager.isProviderRegistered(providerId),
        message: 'Provider reloaded successfully',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
