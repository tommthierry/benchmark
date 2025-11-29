// LLM Validation Schemas
import { z } from 'zod';

// Message role enum
export const llmMessageRoleSchema = z.enum(['system', 'user', 'assistant']);
export type LLMMessageRoleSchema = z.infer<typeof llmMessageRoleSchema>;

// Single message schema
export const llmMessageSchema = z.object({
  role: llmMessageRoleSchema,
  content: z.string().min(1, 'Message content cannot be empty'),
});

// LLM request schema (for API validation)
export const llmRequestSchema = z.object({
  model: z.string().min(1, 'Model is required'),
  messages: z.array(llmMessageSchema).min(1, 'At least one message is required'),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(1000000).optional(),
});

export type LLMRequestInput = z.infer<typeof llmRequestSchema>;

// Test prompt request schema (simpler for quick tests)
// Supports either:
// - modelId: UUID reference to a model in our database
// - model: Direct provider model ID (e.g., "x-ai/grok-4.1-fast:free")
export const testPromptSchema = z.object({
  providerId: z.string().uuid('Invalid provider ID'),
  modelId: z.string().uuid('Invalid model ID').optional(),
  model: z.string().min(1).optional(), // Direct provider model ID
  prompt: z.string().min(1, 'Prompt is required').max(100000),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(100000).optional(),
});

export type TestPromptInput = z.infer<typeof testPromptSchema>;

// Response schema (for validation, not typically needed but useful for mocking)
export const llmResponseSchema = z.object({
  content: z.string(),
  tokensInput: z.number().int().nonnegative(),
  tokensOutput: z.number().int().nonnegative(),
  responseTimeMs: z.number().nonnegative(),
  finishReason: z.enum(['stop', 'length', 'content_filter', 'error', 'unknown']),
  rawResponse: z.record(z.unknown()).optional(),
});

export type LLMResponseSchema = z.infer<typeof llmResponseSchema>;
