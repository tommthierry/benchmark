// Benchmark Types - Shared between server and client
// Types for benchmark execution, progress tracking, and results

/**
 * Options for starting a benchmark run
 */
export interface BenchmarkRunOptions {
  modelIds?: string[];
  questionIds?: string[];
  config?: {
    temperature?: number;
    maxTokens?: number;
  };
}

/**
 * Progress information for a running benchmark
 */
export interface BenchmarkProgress {
  runId: string;
  status: BenchmarkRunStatus;
  totalTasks: number;
  completedTasks: number;
  successfulTasks: number;
  failedTasks: number;
  progress: number; // 0-100 percentage
  startedAt?: string;
  estimatedTimeRemainingMs?: number;
}

/**
 * Status of a benchmark run
 */
export type BenchmarkRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Status of a task execution
 */
export type TaskExecutionStatus = 'pending' | 'success' | 'error' | 'timeout';

/**
 * Evaluator type
 */
export type EvaluatorType = 'rule_based' | 'llm_judge';

/**
 * Result of an evaluation
 */
export interface EvaluationResult {
  score: number;
  maxScore: number;
  normalizedScore: number;
  justification: string;
  evaluatorType: EvaluatorType;
}

/**
 * Task execution result with evaluation
 */
export interface TaskExecutionResult {
  id: string;
  runId: string;
  modelId: string;
  questionId: string;
  inputPrompt: string;
  responseContent: string | null;
  responseTimeMs: number | null;
  tokensInput: number | null;
  tokensOutput: number | null;
  cost: number | null;
  status: TaskExecutionStatus;
  errorMessage: string | null;
  evaluation: EvaluationResult | null;
  createdAt: string;
}

/**
 * Summary statistics for a benchmark run
 */
export interface BenchmarkRunSummary {
  runId: string;
  iterationNumber: number;
  status: BenchmarkRunStatus;
  modelsCount: number;
  questionsCount: number;
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  averageScore: number | null;
  totalCost: number;
  totalTokensInput: number;
  totalTokensOutput: number;
  averageResponseTimeMs: number | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
}
