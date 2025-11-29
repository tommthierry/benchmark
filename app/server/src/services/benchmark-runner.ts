// Benchmark Runner Service - Orchestrates benchmark execution
// Manages run lifecycle, task execution, and progress tracking

import { v4 as uuid } from 'uuid';
import pino from 'pino';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { db, schema, type Model, type Question } from '../db/index.js';
import { getProviderManager } from './llm/index.js';
import { getEvaluator } from './evaluator.js';
import { getRankingCalculator } from './ranking-calculator.js';
import type { LLMResponse, BenchmarkProgress, BenchmarkRunOptions, BenchmarkRunSummary } from '@sabe/shared';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

/**
 * Manages benchmark run execution
 * Handles the full lifecycle: creation, execution, evaluation, and completion
 */
export class BenchmarkRunner {
  // Track active runs for cancellation
  private activeRuns: Set<string> = new Set();

  /**
   * Start a new benchmark run
   * Returns immediately with runId, execution happens asynchronously
   */
  async startRun(options: BenchmarkRunOptions = {}): Promise<string> {
    const runId = uuid();
    const now = new Date();

    // Get next iteration number
    const [lastRun] = await db
      .select({ iterationNumber: schema.benchmarkRuns.iterationNumber })
      .from(schema.benchmarkRuns)
      .orderBy(desc(schema.benchmarkRuns.iterationNumber))
      .limit(1);

    const iterationNumber = (lastRun?.iterationNumber ?? 0) + 1;

    // Get models to test (filtered by options or all active)
    let modelsQuery = db
      .select()
      .from(schema.models)
      .where(eq(schema.models.status, 'active'));

    const allActiveModels = await modelsQuery;
    const models = options.modelIds
      ? allActiveModels.filter(m => options.modelIds!.includes(m.id))
      : allActiveModels;

    // Get questions to run (filtered by options or all active)
    let questionsQuery = db
      .select()
      .from(schema.questions)
      .where(eq(schema.questions.status, 'active'));

    const allActiveQuestions = await questionsQuery;
    const questions = options.questionIds
      ? allActiveQuestions.filter(q => options.questionIds!.includes(q.id))
      : allActiveQuestions;

    if (models.length === 0) {
      throw new Error('No active models found for benchmark');
    }

    if (questions.length === 0) {
      throw new Error('No active questions found for benchmark');
    }

    // Create run record
    await db.insert(schema.benchmarkRuns).values({
      id: runId,
      iterationNumber,
      status: 'pending',
      modelsCount: models.length,
      questionsCount: questions.length,
      configSnapshot: options.config ?? {},
      createdAt: now,
    });

    logger.info({
      runId,
      iterationNumber,
      modelsCount: models.length,
      questionsCount: questions.length,
    }, 'Benchmark run created');

    // Start execution asynchronously (don't await)
    this.executeRun(runId, models, questions, options.config)
      .catch(error => {
        logger.error({ runId, error: error.message }, 'Benchmark run failed');
        this.failRun(runId, error.message);
      });

    return runId;
  }

  /**
   * Execute the benchmark run
   * Processes all model × question combinations
   */
  private async executeRun(
    runId: string,
    models: Model[],
    questions: Question[],
    configOverrides?: { temperature?: number; maxTokens?: number }
  ): Promise<void> {
    this.activeRuns.add(runId);

    try {
      // Update status to running
      await db
        .update(schema.benchmarkRuns)
        .set({ status: 'running', startedAt: new Date() })
        .where(eq(schema.benchmarkRuns.id, runId));

      const providerManager = await getProviderManager();
      const evaluator = getEvaluator();
      let successCount = 0;
      let errorCount = 0;

      // Execute model × question matrix
      for (const model of models) {
        // Check if run was cancelled
        if (!this.activeRuns.has(runId)) {
          logger.info({ runId }, 'Benchmark run cancelled, stopping execution');
          return;
        }

        for (const question of questions) {
          // Check cancellation before each task
          if (!this.activeRuns.has(runId)) {
            logger.info({ runId }, 'Benchmark run cancelled, stopping execution');
            return;
          }

          try {
            await this.executeTask(
              runId,
              model,
              question,
              providerManager,
              evaluator,
              configOverrides
            );
            successCount++;
          } catch (error) {
            errorCount++;
            logger.error({
              runId,
              modelId: model.id,
              questionId: question.id,
              error: (error as Error).message,
            }, 'Task execution failed');
          }
        }
      }

      // Only update to completed if not cancelled
      if (this.activeRuns.has(runId)) {
        await db
          .update(schema.benchmarkRuns)
          .set({
            status: 'completed',
            completedAt: new Date(),
          })
          .where(eq(schema.benchmarkRuns.id, runId));

        // Calculate rankings after run completion
        try {
          const rankingCalculator = getRankingCalculator();
          await rankingCalculator.calculateForRun(runId);
          logger.info({ runId }, 'Rankings calculated successfully');
        } catch (rankingError) {
          // Log error but don't fail the run - rankings are not critical
          logger.error({
            runId,
            error: (rankingError as Error).message,
          }, 'Failed to calculate rankings');
        }

        logger.info({
          runId,
          successCount,
          errorCount,
          totalTasks: models.length * questions.length,
        }, 'Benchmark run completed');
      }
    } finally {
      this.activeRuns.delete(runId);
    }
  }

  /**
   * Execute a single task (one model answering one question)
   */
  private async executeTask(
    runId: string,
    model: Model,
    question: Question,
    providerManager: Awaited<ReturnType<typeof getProviderManager>>,
    evaluator: ReturnType<typeof getEvaluator>,
    configOverrides?: { temperature?: number; maxTokens?: number }
  ): Promise<void> {
    const executionId = uuid();
    const now = new Date();

    // Create pending task execution record
    await db.insert(schema.taskExecutions).values({
      id: executionId,
      runId,
      modelId: model.id,
      questionId: question.id,
      inputPrompt: question.content,
      status: 'pending',
      createdAt: now,
    });

    try {
      // Check if provider is registered
      if (!providerManager.isProviderRegistered(model.providerId)) {
        throw new Error(`Provider ${model.providerId} not registered or API key not configured`);
      }

      // Determine config: override > model config > defaults
      const temperature = configOverrides?.temperature ?? model.config?.temperature ?? 0.7;
      const maxTokens = configOverrides?.maxTokens ?? model.config?.maxTokens ?? 1000;

      // Send prompt to LLM
      const response = await providerManager.sendPrompt(
        model.providerId,
        model.providerModelId,
        question.content,
        { temperature, maxTokens }
      );

      // Calculate cost
      const cost = this.calculateCost(model, response);

      // Update task execution with response
      await db
        .update(schema.taskExecutions)
        .set({
          responseContent: response.content,
          responseTimeMs: response.responseTimeMs,
          tokensInput: response.tokensInput,
          tokensOutput: response.tokensOutput,
          cost,
          status: 'success',
          rawResponse: response.rawResponse,
        })
        .where(eq(schema.taskExecutions.id, executionId));

      // Evaluate the response
      await evaluator.evaluate(executionId, question, response.content);

      logger.debug({
        executionId,
        modelId: model.id,
        questionId: question.id,
        responseTimeMs: response.responseTimeMs,
        tokensTotal: response.tokensInput + response.tokensOutput,
      }, 'Task executed successfully');

    } catch (error) {
      const errorMessage = (error as Error).message;
      const isTimeout = errorMessage.toLowerCase().includes('timeout');

      // Update task execution with error
      await db
        .update(schema.taskExecutions)
        .set({
          status: isTimeout ? 'timeout' : 'error',
          errorMessage,
        })
        .where(eq(schema.taskExecutions.id, executionId));

      throw error;
    }
  }

  /**
   * Calculate cost based on model pricing and token usage
   */
  private calculateCost(model: Model, response: LLMResponse): number {
    const inputCost = (response.tokensInput / 1_000_000) * (model.costInputPerMillion ?? 0);
    const outputCost = (response.tokensOutput / 1_000_000) * (model.costOutputPerMillion ?? 0);
    return inputCost + outputCost;
  }

  /**
   * Mark a run as failed
   */
  private async failRun(runId: string, errorMessage: string): Promise<void> {
    this.activeRuns.delete(runId);
    await db
      .update(schema.benchmarkRuns)
      .set({
        status: 'failed',
        errorLog: errorMessage,
        completedAt: new Date(),
      })
      .where(eq(schema.benchmarkRuns.id, runId));
  }

  /**
   * Get progress for a running benchmark
   */
  async getProgress(runId: string): Promise<BenchmarkProgress | null> {
    const [run] = await db
      .select()
      .from(schema.benchmarkRuns)
      .where(eq(schema.benchmarkRuns.id, runId));

    if (!run) return null;

    const tasks = await db
      .select({
        status: schema.taskExecutions.status,
      })
      .from(schema.taskExecutions)
      .where(eq(schema.taskExecutions.runId, runId));

    const totalTasks = run.modelsCount * run.questionsCount;
    const completedTasks = tasks.filter(t =>
      t.status === 'success' || t.status === 'error' || t.status === 'timeout'
    ).length;
    const successfulTasks = tasks.filter(t => t.status === 'success').length;
    const failedTasks = tasks.filter(t => t.status === 'error' || t.status === 'timeout').length;

    return {
      runId,
      status: run.status as BenchmarkProgress['status'],
      totalTasks,
      completedTasks,
      successfulTasks,
      failedTasks,
      progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      startedAt: run.startedAt?.toISOString(),
    };
  }

  /**
   * Get summary statistics for a completed run
   */
  async getSummary(runId: string): Promise<BenchmarkRunSummary | null> {
    const [run] = await db
      .select()
      .from(schema.benchmarkRuns)
      .where(eq(schema.benchmarkRuns.id, runId));

    if (!run) return null;

    // Get all task executions
    const tasks = await db
      .select()
      .from(schema.taskExecutions)
      .where(eq(schema.taskExecutions.runId, runId));

    // Get all evaluations for these tasks
    const taskIds = tasks.map(t => t.id);
    const evaluations = taskIds.length > 0
      ? await db
          .select()
          .from(schema.evaluations)
          .where(inArray(schema.evaluations.executionId, taskIds))
      : [];

    // Calculate statistics
    const successfulTasks = tasks.filter(t => t.status === 'success');
    const failedTasks = tasks.filter(t => t.status === 'error' || t.status === 'timeout');

    const totalCost = successfulTasks.reduce((sum, t) => sum + (t.cost ?? 0), 0);
    const totalTokensInput = successfulTasks.reduce((sum, t) => sum + (t.tokensInput ?? 0), 0);
    const totalTokensOutput = successfulTasks.reduce((sum, t) => sum + (t.tokensOutput ?? 0), 0);

    const responseTimes = successfulTasks
      .map(t => t.responseTimeMs)
      .filter((ms): ms is number => ms !== null);
    const averageResponseTimeMs = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null;

    const scores = evaluations.map(e => e.normalizedScore);
    const averageScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
      : null;

    const durationMs = run.startedAt && run.completedAt
      ? run.completedAt.getTime() - run.startedAt.getTime()
      : null;

    return {
      runId,
      iterationNumber: run.iterationNumber,
      status: run.status as BenchmarkRunSummary['status'],
      modelsCount: run.modelsCount,
      questionsCount: run.questionsCount,
      totalTasks: run.modelsCount * run.questionsCount,
      successfulTasks: successfulTasks.length,
      failedTasks: failedTasks.length,
      averageScore,
      totalCost,
      totalTokensInput,
      totalTokensOutput,
      averageResponseTimeMs,
      startedAt: run.startedAt?.toISOString() ?? null,
      completedAt: run.completedAt?.toISOString() ?? null,
      durationMs,
    };
  }

  /**
   * Cancel a running benchmark
   */
  async cancelRun(runId: string): Promise<boolean> {
    const [run] = await db
      .select()
      .from(schema.benchmarkRuns)
      .where(eq(schema.benchmarkRuns.id, runId));

    if (!run || run.status !== 'running') {
      return false;
    }

    // Remove from active runs to signal cancellation
    this.activeRuns.delete(runId);

    await db
      .update(schema.benchmarkRuns)
      .set({
        status: 'cancelled',
        completedAt: new Date(),
      })
      .where(eq(schema.benchmarkRuns.id, runId));

    logger.info({ runId }, 'Benchmark run cancelled');
    return true;
  }

  /**
   * Check if a run is currently active
   */
  isRunActive(runId: string): boolean {
    return this.activeRuns.has(runId);
  }
}

// Singleton instance
let runnerInstance: BenchmarkRunner | null = null;

/**
 * Get the singleton benchmark runner instance
 */
export function getBenchmarkRunner(): BenchmarkRunner {
  if (!runnerInstance) {
    runnerInstance = new BenchmarkRunner();
  }
  return runnerInstance;
}
