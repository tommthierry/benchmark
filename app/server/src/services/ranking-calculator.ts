// Ranking Calculator Service - Calculates rankings after benchmark runs
// Supports global rankings and per-question-type rankings with delta tracking

import { v4 as uuid } from 'uuid';
import pino from 'pino';
import { eq, and, desc, lt, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { ModelScore, RankingType } from '@sabe/shared';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

/**
 * Internal ranking entry before database insertion
 */
interface RankingEntry {
  modelId: string;
  position: number;
  score: number;
  previousPosition: number | null;
  deltaPosition: number | null;
  deltaScore: number | null;
  sampleSize: number;
}

/**
 * Calculates and stores rankings for benchmark runs
 */
export class RankingCalculator {
  /**
   * Calculate all rankings for a completed benchmark run
   */
  async calculateForRun(runId: string): Promise<void> {
    logger.info({ runId }, 'Starting ranking calculations');

    // Verify run exists and is completed
    const [currentRun] = await db
      .select()
      .from(schema.benchmarkRuns)
      .where(eq(schema.benchmarkRuns.id, runId));

    if (!currentRun) {
      throw new Error(`Run ${runId} not found`);
    }

    // Get previous completed run for delta calculations
    const [previousRun] = await db
      .select()
      .from(schema.benchmarkRuns)
      .where(
        and(
          lt(schema.benchmarkRuns.iterationNumber, currentRun.iterationNumber),
          eq(schema.benchmarkRuns.status, 'completed')
        )
      )
      .orderBy(desc(schema.benchmarkRuns.iterationNumber))
      .limit(1);

    // Calculate global rankings
    await this.calculateGlobalRanking(runId, previousRun?.id);

    // Calculate per-type rankings
    await this.calculateTypeRankings(runId, previousRun?.id);

    logger.info({ runId }, 'Ranking calculations completed');
  }

  /**
   * Calculate global ranking across all questions
   */
  private async calculateGlobalRanking(
    runId: string,
    previousRunId?: string
  ): Promise<void> {
    const scores = await this.getModelScores(runId);

    if (scores.length === 0) {
      logger.debug({ runId }, 'No model scores found for global ranking');
      return;
    }

    // Get previous rankings for delta calculation
    const previousRankings = previousRunId
      ? await this.getPreviousRankings(previousRunId, 'global')
      : new Map<string, { position: number; score: number }>();

    // Sort by score descending to determine positions
    const sortedScores = [...scores].sort((a, b) => b.averageScore - a.averageScore);

    // Create ranking entries
    const rankings: RankingEntry[] = sortedScores.map((score, index) => {
      const position = index + 1;
      const previous = previousRankings.get(score.modelId);

      return {
        modelId: score.modelId,
        position,
        score: score.averageScore,
        previousPosition: previous?.position ?? null,
        // Positive delta = improved (moved up in rank)
        deltaPosition: previous ? previous.position - position : null,
        deltaScore: previous ? score.averageScore - previous.score : null,
        sampleSize: score.totalQuestions,
      };
    });

    await this.insertRankings(runId, 'global', null, rankings);

    logger.debug({
      runId,
      type: 'global',
      count: rankings.length,
    }, 'Global rankings calculated');
  }

  /**
   * Calculate rankings per question type
   */
  private async calculateTypeRankings(
    runId: string,
    previousRunId?: string
  ): Promise<void> {
    // Get all question types
    const questionTypes = await db.select().from(schema.questionTypes);

    for (const qType of questionTypes) {
      const scores = await this.getModelScoresByType(runId, qType.id);

      if (scores.length === 0) {
        logger.debug({ runId, typeId: qType.id }, 'No scores for question type');
        continue;
      }

      const previousRankings = previousRunId
        ? await this.getPreviousRankings(previousRunId, 'by_question_type', qType.name)
        : new Map<string, { position: number; score: number }>();

      const sortedScores = [...scores].sort((a, b) => b.averageScore - a.averageScore);

      const rankings: RankingEntry[] = sortedScores.map((score, index) => {
        const position = index + 1;
        const previous = previousRankings.get(score.modelId);

        return {
          modelId: score.modelId,
          position,
          score: score.averageScore,
          previousPosition: previous?.position ?? null,
          deltaPosition: previous ? previous.position - position : null,
          deltaScore: previous ? score.averageScore - previous.score : null,
          sampleSize: score.totalQuestions,
        };
      });

      await this.insertRankings(runId, 'by_question_type', qType.name, rankings);

      logger.debug({
        runId,
        type: 'by_question_type',
        dimension: qType.name,
        count: rankings.length,
      }, 'Type rankings calculated');
    }
  }

  /**
   * Get average scores per model for a run
   */
  private async getModelScores(runId: string): Promise<ModelScore[]> {
    const results = await db
      .select({
        modelId: schema.taskExecutions.modelId,
        avgScore: sql<number>`AVG(${schema.evaluations.normalizedScore})`,
        totalQuestions: sql<number>`COUNT(DISTINCT ${schema.taskExecutions.questionId})`,
        successCount: sql<number>`SUM(CASE WHEN ${schema.taskExecutions.status} = 'success' THEN 1 ELSE 0 END)`,
        totalCount: sql<number>`COUNT(*)`,
      })
      .from(schema.taskExecutions)
      .leftJoin(
        schema.evaluations,
        eq(schema.taskExecutions.id, schema.evaluations.executionId)
      )
      .where(eq(schema.taskExecutions.runId, runId))
      .groupBy(schema.taskExecutions.modelId);

    // Get model names for enrichment
    const models = await db.select().from(schema.models);
    const modelMap = new Map(models.map(m => [m.id, m.displayName]));

    return results.map(r => ({
      modelId: r.modelId,
      modelName: modelMap.get(r.modelId) ?? 'Unknown',
      averageScore: r.avgScore ?? 0,
      totalQuestions: r.totalQuestions ?? 0,
      successRate: r.totalCount > 0 ? (r.successCount / r.totalCount) * 100 : 0,
    }));
  }

  /**
   * Get average scores per model for a specific question type
   */
  private async getModelScoresByType(
    runId: string,
    typeId: string
  ): Promise<ModelScore[]> {
    const results = await db
      .select({
        modelId: schema.taskExecutions.modelId,
        avgScore: sql<number>`AVG(${schema.evaluations.normalizedScore})`,
        totalQuestions: sql<number>`COUNT(DISTINCT ${schema.taskExecutions.questionId})`,
        successCount: sql<number>`SUM(CASE WHEN ${schema.taskExecutions.status} = 'success' THEN 1 ELSE 0 END)`,
        totalCount: sql<number>`COUNT(*)`,
      })
      .from(schema.taskExecutions)
      .innerJoin(
        schema.questions,
        eq(schema.taskExecutions.questionId, schema.questions.id)
      )
      .leftJoin(
        schema.evaluations,
        eq(schema.taskExecutions.id, schema.evaluations.executionId)
      )
      .where(
        and(
          eq(schema.taskExecutions.runId, runId),
          eq(schema.questions.typeId, typeId)
        )
      )
      .groupBy(schema.taskExecutions.modelId);

    const models = await db.select().from(schema.models);
    const modelMap = new Map(models.map(m => [m.id, m.displayName]));

    return results.map(r => ({
      modelId: r.modelId,
      modelName: modelMap.get(r.modelId) ?? 'Unknown',
      averageScore: r.avgScore ?? 0,
      totalQuestions: r.totalQuestions ?? 0,
      successRate: r.totalCount > 0 ? (r.successCount / r.totalCount) * 100 : 0,
    }));
  }

  /**
   * Get previous rankings for delta calculations
   */
  private async getPreviousRankings(
    runId: string,
    rankingType: RankingType,
    dimension?: string
  ): Promise<Map<string, { position: number; score: number }>> {
    const rankings = await db
      .select()
      .from(schema.rankings)
      .where(
        and(
          eq(schema.rankings.runId, runId),
          eq(schema.rankings.rankingType, rankingType)
        )
      );

    // Filter by dimension if specified (for by_question_type)
    const filtered = dimension
      ? rankings.filter(r => r.dimension === dimension)
      : rankings.filter(r => r.dimension === null);

    return new Map(
      filtered.map(r => [r.modelId, { position: r.position, score: r.score }])
    );
  }

  /**
   * Insert ranking entries into database
   */
  private async insertRankings(
    runId: string,
    rankingType: RankingType,
    dimension: string | null,
    entries: RankingEntry[]
  ): Promise<void> {
    if (entries.length === 0) return;

    const now = new Date();

    const values = entries.map(entry => ({
      id: uuid(),
      runId,
      modelId: entry.modelId,
      rankingType,
      dimension,
      position: entry.position,
      score: entry.score,
      previousPosition: entry.previousPosition,
      deltaPosition: entry.deltaPosition,
      deltaScore: entry.deltaScore,
      sampleSize: entry.sampleSize,
      createdAt: now,
    }));

    await db.insert(schema.rankings).values(values);
  }
}

// Singleton instance
let calculatorInstance: RankingCalculator | null = null;

/**
 * Get the singleton ranking calculator instance
 */
export function getRankingCalculator(): RankingCalculator {
  if (!calculatorInstance) {
    calculatorInstance = new RankingCalculator();
  }
  return calculatorInstance;
}
