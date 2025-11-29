// Ranking Schemas - Zod validation for ranking API endpoints

import { z } from 'zod';

/**
 * Query params for latest rankings
 */
export const latestRankingsQuerySchema = z.object({
  type: z.enum(['global', 'by_question_type']).optional().default('global'),
});

/**
 * Path params for rankings by question type
 */
export const rankingsByTypeParamsSchema = z.object({
  type: z.string().min(1, 'Question type is required'),
});

/**
 * Path params for temporal comparison
 */
export const temporalComparisonParamsSchema = z.object({
  period: z.enum(['wow', 'mom', 'qoq', 'yoy']),
});

/**
 * Path params for model history
 */
export const modelHistoryParamsSchema = z.object({
  modelId: z.string().uuid('Invalid model ID'),
});

/**
 * Query params for model history (limit)
 */
export const modelHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

/**
 * Query params for trends
 */
export const trendsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

/**
 * Path params for run-specific rankings
 */
export const runRankingsParamsSchema = z.object({
  runId: z.string().uuid('Invalid run ID'),
});

/**
 * Query params for run-specific rankings
 */
export const runRankingsQuerySchema = z.object({
  type: z.enum(['global', 'by_question_type', 'comparative']).optional().default('global'),
  dimension: z.string().optional(),
});

// Export types for use in routes
export type LatestRankingsQuery = z.infer<typeof latestRankingsQuerySchema>;
export type RankingsByTypeParams = z.infer<typeof rankingsByTypeParamsSchema>;
export type TemporalComparisonParams = z.infer<typeof temporalComparisonParamsSchema>;
export type ModelHistoryParams = z.infer<typeof modelHistoryParamsSchema>;
export type ModelHistoryQuery = z.infer<typeof modelHistoryQuerySchema>;
export type TrendsQuery = z.infer<typeof trendsQuerySchema>;
export type RunRankingsParams = z.infer<typeof runRankingsParamsSchema>;
export type RunRankingsQuery = z.infer<typeof runRankingsQuerySchema>;
