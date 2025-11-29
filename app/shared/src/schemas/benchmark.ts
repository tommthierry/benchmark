// Benchmark Schemas - Zod validation for benchmark operations
import { z } from 'zod';

/**
 * Schema for starting a new benchmark run
 */
export const startBenchmarkRunSchema = z.object({
  modelIds: z.array(z.string().uuid()).optional(),
  questionIds: z.array(z.string().uuid()).optional(),
  config: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().max(100000).optional(),
  }).optional(),
});

export type StartBenchmarkRunInput = z.infer<typeof startBenchmarkRunSchema>;

/**
 * Schema for benchmark run query parameters
 */
export const benchmarkRunQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional(),
});

export type BenchmarkRunQueryInput = z.infer<typeof benchmarkRunQuerySchema>;

/**
 * Schema for run ID parameter
 */
export const runIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type RunIdParamInput = z.infer<typeof runIdParamSchema>;
