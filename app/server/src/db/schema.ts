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
// GAME SESSIONS - Arena session tracking
// =============================================================================
export const gameSessions = sqliteTable('game_sessions', {
  id: text('id').primaryKey(),
  status: text('status', {
    enum: ['created', 'running', 'paused', 'completed', 'failed']
  }).notNull().default('created'),
  totalRounds: integer('total_rounds').notNull().default(5),
  completedRounds: integer('completed_rounds').notNull().default(0),
  currentRoundId: text('current_round_id'),
  participatingModelIds: text('participating_model_ids', { mode: 'json' })
    .$type<string[]>().notNull(),
  config: text('config', { mode: 'json' }).$type<{
    stepDelayMs?: number;
    allowTies?: boolean;
  }>(),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// =============================================================================
// ROUNDS - Individual rounds within a game session
// =============================================================================
export const rounds = sqliteTable('rounds', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => gameSessions.id),
  roundNumber: integer('round_number').notNull(),
  status: text('status', {
    enum: ['created', 'topic_selection', 'question_creation', 'answering',
           'judging', 'scoring', 'completed', 'failed']
  }).notNull().default('created'),
  masterId: text('master_id').notNull().references(() => models.id),
  topicId: text('topic_id').references(() => questionTypes.id),
  questionContent: text('question_content'),
  questionDifficulty: text('question_difficulty', {
    enum: ['easy', 'medium', 'hard', 'expert']
  }),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// =============================================================================
// ROUND STEPS - Atomic steps within a round
// =============================================================================
export const roundSteps = sqliteTable('round_steps', {
  id: text('id').primaryKey(),
  roundId: text('round_id').notNull().references(() => rounds.id),
  stepNumber: integer('step_number').notNull(),
  stepType: text('step_type', {
    enum: ['master_topic', 'master_question', 'model_answer', 'model_judge', 'scoring']
  }).notNull(),
  status: text('status', {
    enum: ['pending', 'running', 'completed', 'failed', 'skipped']
  }).notNull().default('pending'),
  actorModelId: text('actor_model_id').references(() => models.id),
  targetModelId: text('target_model_id').references(() => models.id),
  inputData: text('input_data', { mode: 'json' }).$type<Record<string, unknown>>(),
  outputData: text('output_data', { mode: 'json' }).$type<Record<string, unknown>>(),
  llmResponseTimeMs: integer('llm_response_time_ms'),
  llmTokensUsed: integer('llm_tokens_used'),
  errorMessage: text('error_message'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// =============================================================================
// MODEL JUDGMENTS - Peer evaluation scores
// =============================================================================
export const modelJudgments = sqliteTable('model_judgments', {
  id: text('id').primaryKey(),
  roundId: text('round_id').notNull().references(() => rounds.id),
  stepId: text('step_id').notNull().references(() => roundSteps.id),
  judgeModelId: text('judge_model_id').notNull().references(() => models.id),
  targetModelId: text('target_model_id').notNull().references(() => models.id),
  score: real('score').notNull(),
  rank: integer('rank').notNull(),
  reasoning: text('reasoning'),
  criteriaScores: text('criteria_scores', { mode: 'json' }).$type<{
    accuracy?: number;
    clarity?: number;
    creativity?: number;
    completeness?: number;
  }>(),
  isMasterJudgment: integer('is_master_judgment', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// =============================================================================
// EXECUTION CONFIG - Singleton configuration for arena execution
// =============================================================================
export const executionConfig = sqliteTable('execution_config', {
  id: text('id').primaryKey().default('default'), // Always 'default'
  executionMode: text('execution_mode', {
    enum: ['cron', 'manual']
  }).notNull().default('manual'),
  cronExpression: text('cron_expression').default('0 2 * * 1'), // Weekly Monday 2AM
  timezone: text('timezone').default('UTC'),
  autoStartEnabled: integer('auto_start_enabled', { mode: 'boolean' }).default(false),
  roundsPerSession: integer('rounds_per_session').default(5),
  stepDelayMs: integer('step_delay_ms').default(2000), // Delay between steps
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
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
export type ExecutionConfig = typeof executionConfig.$inferSelect;
export type NewExecutionConfig = typeof executionConfig.$inferInsert;
export type GameSession = typeof gameSessions.$inferSelect;
export type NewGameSession = typeof gameSessions.$inferInsert;
export type Round = typeof rounds.$inferSelect;
export type NewRound = typeof rounds.$inferInsert;
export type RoundStep = typeof roundSteps.$inferSelect;
export type NewRoundStep = typeof roundSteps.$inferInsert;
export type ModelJudgment = typeof modelJudgments.$inferSelect;
export type NewModelJudgment = typeof modelJudgments.$inferInsert;
