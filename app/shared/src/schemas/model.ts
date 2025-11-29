// Model validation schemas
import { z } from 'zod';

export const modelStatusSchema = z.enum(['active', 'inactive', 'deprecated']);
export type ModelStatus = z.infer<typeof modelStatusSchema>;

export const modelConfigSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
}).optional();

export const createModelSchema = z.object({
  providerId: z.string().min(1, 'Provider ID is required'),
  providerModelId: z.string().min(1, 'Provider model ID is required').max(200),
  displayName: z.string().min(1, 'Display name is required').max(200),
  label: z.string().max(100).optional(),
  status: modelStatusSchema.optional().default('active'),
  contextSize: z.number().int().positive().optional(),
  costInputPerMillion: z.number().nonnegative().optional(),
  costOutputPerMillion: z.number().nonnegative().optional(),
  config: modelConfigSchema,
});

export const updateModelSchema = createModelSchema.partial();

export const updateModelStatusSchema = z.object({
  status: modelStatusSchema,
});

export type CreateModelInput = z.infer<typeof createModelSchema>;
export type UpdateModelInput = z.infer<typeof updateModelSchema>;
export type UpdateModelStatusInput = z.infer<typeof updateModelStatusSchema>;
