// SABE Database Schema - Drizzle ORM with SQLite
// All 8 core tables for the benchmark platform

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// =============================================================================
// PROVIDERS - LLM API providers (OpenRouter, etc.)
// =============================================================================
export const providers = sqliteTable('providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  apiEndpoint: text('api_endpoint').notNull(),
  apiKeyEnvVar: text('api_key_env_var').notNull(),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  rateLimitPerMinute: integer('rate_limit_per_minute').default(60),
  config: text('config', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// =============================================================================
// MODELS - LLM models catalog
// =============================================================================
export const models = sqliteTable('models', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull().references(() => providers.id),
  providerModelId: text('provider_model_id').notNull(),
  displayName: text('display_name').notNull(),
  label: text('label'),
  status: text('status', { enum: ['active', 'inactive', 'deprecated'] }).notNull().default('active'),
  contextSize: integer('context_size'),
  costInputPerMillion: real('cost_input_per_million'),
  costOutputPerMillion: real('cost_output_per_million'),
  config: text('config', { mode: 'json' }).$type<{ temperature?: number; maxTokens?: number }>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// =============================================================================
// QUESTION TYPES - Categories for benchmark questions
// =============================================================================
export const questionTypes = sqliteTable('question_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  weight: real('weight').notNull().default(1.0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// =============================================================================
// QUESTIONS - Benchmark prompts
// =============================================================================
export const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  typeId: text('type_id').notNull().references(() => questionTypes.id),
  content: text('content').notNull(),
  expectedAnswer: text('expected_answer'),
  evaluationMethod: text('evaluation_method', {
    enum: ['exact_match', 'contains', 'regex', 'llm_judge'],
  }).notNull().default('llm_judge'),
  evaluationCriteria: text('evaluation_criteria', { mode: 'json' }).$type<{
    pattern?: string;
    keywords?: string[];
    rubric?: string;
  }>(),
  difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard', 'expert'] }).default('medium'),
  weight: real('weight').notNull().default(1.0),
  status: text('status', { enum: ['active', 'archived'] }).notNull().default('active'),
  version: integer('version').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// =============================================================================
// BENCHMARK RUNS - Execution instances
// =============================================================================
export const benchmarkRuns = sqliteTable('benchmark_runs', {
  id: text('id').primaryKey(),
  iterationNumber: integer('iteration_number').notNull(),
  status: text('status', {
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
  }).notNull().default('pending'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  modelsCount: integer('models_count').notNull().default(0),
  questionsCount: integer('questions_count').notNull().default(0),
  configSnapshot: text('config_snapshot', { mode: 'json' }).$type<Record<string, unknown>>(),
  errorLog: text('error_log'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// =============================================================================
// TASK EXECUTIONS - Individual model responses
// =============================================================================
export const taskExecutions = sqliteTable('task_executions', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => benchmarkRuns.id),
  modelId: text('model_id').notNull().references(() => models.id),
  questionId: text('question_id').notNull().references(() => questions.id),
  inputPrompt: text('input_prompt').notNull(),
  responseContent: text('response_content'),
  responseTimeMs: integer('response_time_ms'),
  tokensInput: integer('tokens_input'),
  tokensOutput: integer('tokens_output'),
  cost: real('cost'),
  status: text('status', { enum: ['pending', 'success', 'error', 'timeout'] }).notNull().default('pending'),
  errorMessage: text('error_message'),
  rawResponse: text('raw_response', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// =============================================================================
// EVALUATIONS - Scored responses
// =============================================================================
export const evaluations = sqliteTable('evaluations', {
  id: text('id').primaryKey(),
  executionId: text('execution_id').notNull().references(() => taskExecutions.id),
  evaluatorType: text('evaluator_type', { enum: ['rule_based', 'llm_judge'] }).notNull(),
  evaluatorModelId: text('evaluator_model_id').references(() => models.id),
  score: real('score').notNull(),
  maxScore: real('max_score').notNull().default(100),
  normalizedScore: real('normalized_score').notNull(),
  justification: text('justification'),
  criteriaScores: text('criteria_scores', { mode: 'json' }).$type<Record<string, number>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// =============================================================================
// RANKINGS - Calculated rankings
// =============================================================================
export const rankings = sqliteTable('rankings', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => benchmarkRuns.id),
  modelId: text('model_id').notNull().references(() => models.id),
  rankingType: text('ranking_type', {
    enum: ['global', 'by_question_type', 'comparative'],
  }).notNull(),
  dimension: text('dimension'),
  position: integer('position').notNull(),
  score: real('score').notNull(),
  previousPosition: integer('previous_position'),
  deltaPosition: integer('delta_position'),
  deltaScore: real('delta_score'),
  sampleSize: integer('sample_size').notNull(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// =============================================================================
// TYPE EXPORTS - For TypeScript inference
// =============================================================================
export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;
export type QuestionType = typeof questionTypes.$inferSelect;
export type NewQuestionType = typeof questionTypes.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type BenchmarkRun = typeof benchmarkRuns.$inferSelect;
export type NewBenchmarkRun = typeof benchmarkRuns.$inferInsert;
export type TaskExecution = typeof taskExecutions.$inferSelect;
export type NewTaskExecution = typeof taskExecutions.$inferInsert;
export type Evaluation = typeof evaluations.$inferSelect;
export type NewEvaluation = typeof evaluations.$inferInsert;
export type Ranking = typeof rankings.$inferSelect;
export type NewRanking = typeof rankings.$inferInsert;
