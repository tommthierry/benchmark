// Ranking Types - Shared between server and client
// Types for ranking calculations, comparisons, and trends

/**
 * Type of ranking calculation
 */
export type RankingType = 'global' | 'by_question_type' | 'comparative';

/**
 * Period for temporal comparisons
 */
export type ComparisonPeriod = 'wow' | 'mom' | 'qoq' | 'yoy';

/**
 * Trend direction indicator
 */
export type TrendDirection = 'up' | 'down' | 'stable';

/**
 * A single ranking entry for a model
 */
export interface RankingEntry {
  id: string;
  runId: string;
  modelId: string;
  rankingType: RankingType;
  dimension: string | null;
  position: number;
  score: number;
  previousPosition: number | null;
  deltaPosition: number | null;
  deltaScore: number | null;
  sampleSize: number;
  createdAt: string;
}

/**
 * Ranking entry with model details
 */
export interface RankingWithModel extends RankingEntry {
  model: {
    id: string;
    displayName: string;
    providerModelId: string;
  } | null;
}

/**
 * Rankings response with run metadata
 */
export interface RankingsResponse {
  data: RankingWithModel[];
  run: {
    id: string;
    iterationNumber: number;
    completedAt: string | null;
  } | null;
}

/**
 * Rankings by type response
 */
export interface RankingsByTypeResponse extends RankingsResponse {
  type: string;
}

/**
 * Model score data for ranking calculation
 */
export interface ModelScore {
  modelId: string;
  modelName: string;
  averageScore: number;
  totalQuestions: number;
  successRate: number;
}

/**
 * Temporal comparison for a model
 */
export interface TemporalComparison {
  modelId: string;
  modelName: string;
  periodType: ComparisonPeriod;
  currentScore: number;
  previousScore: number;
  deltaAbsolute: number;
  deltaPercentage: number;
  currentPosition: number;
  previousPosition: number | null;
  positionChange: number | null;
  trend: TrendDirection;
}

/**
 * Score data point for trend analysis
 */
export interface ScoreDataPoint {
  runId: string;
  date: string;
  score: number;
  position: number;
}

/**
 * Model trend over time
 */
export interface ModelTrend {
  modelId: string;
  modelName: string;
  scores: ScoreDataPoint[];
}

/**
 * Available question types for ranking
 */
export interface QuestionTypeInfo {
  id: string;
  name: string;
  description: string | null;
}
