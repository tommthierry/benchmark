// Provider validation schemas
import { z } from 'zod';

export const providerStatusSchema = z.enum(['active', 'inactive']);
export type ProviderStatus = z.infer<typeof providerStatusSchema>;

export const createProviderSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  apiEndpoint: z.string().url('Must be a valid URL'),
  apiKeyEnvVar: z.string().min(1, 'API key env var is required').max(100),
  status: providerStatusSchema.optional().default('active'),
  rateLimitPerMinute: z.number().int().positive().optional().default(60),
  config: z.record(z.unknown()).optional(),
});

export const updateProviderSchema = createProviderSchema.partial();

export type CreateProviderInput = z.infer<typeof createProviderSchema>;
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
