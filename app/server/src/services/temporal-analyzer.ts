// Temporal Analyzer Service - Compares rankings across time periods
// Supports WoW (week-over-week), MoM (month-over-month), and other comparisons

import pino from 'pino';
import { eq, and, desc, lte } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { ComparisonPeriod, TemporalComparison, ModelTrend, TrendDirection } from '@sabe/shared';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

/**
 * Days per comparison period
 */
const PERIOD_DAYS: Record<ComparisonPeriod, number> = {
  wow: 7,    // Week over week
  mom: 30,   // Month over month
  qoq: 90,   // Quarter over quarter
  yoy: 365,  // Year over year
};

/**
 * Analyzes ranking trends over time
 */
export class TemporalAnalyzer {
  /**
   * Compare rankings between current and a previous period
   */
  async compare(period: ComparisonPeriod): Promise<TemporalComparison[]> {
    const now = new Date();
    const daysAgo = PERIOD_DAYS[period];
    const previousDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Get latest completed run
    const [latestRun] = await db
      .select()
      .from(schema.benchmarkRuns)
      .where(eq(schema.benchmarkRuns.status, 'completed'))
      .orderBy(desc(schema.benchmarkRuns.completedAt))
      .limit(1);

    if (!latestRun) {
      logger.debug('No completed runs found for comparison');
      return [];
    }

    // Get run closest to the previous date
    const [previousRun] = await db
      .select()
      .from(schema.benchmarkRuns)
      .where(
        and(
          eq(schema.benchmarkRuns.status, 'completed'),
          lte(schema.benchmarkRuns.completedAt, previousDate)
        )
      )
      .orderBy(desc(schema.benchmarkRuns.completedAt))
      .limit(1);

    if (!previousRun) {
      logger.debug({ period, previousDate }, 'No previous run found for comparison period');
      return [];
    }

    // Get current global rankings
    const currentRankings = await db
      .select()
      .from(schema.rankings)
      .where(
        and(
          eq(schema.rankings.runId, latestRun.id),
          eq(schema.rankings.rankingType, 'global')
        )
      );

    // Get previous global rankings
    const previousRankings = await db
      .select()
      .from(schema.rankings)
      .where(
        and(
          eq(schema.rankings.runId, previousRun.id),
          eq(schema.rankings.rankingType, 'global')
        )
      );

    // Create map for previous rankings lookup
    const previousMap = new Map(
      previousRankings.map(r => [r.modelId, { score: r.score, position: r.position }])
    );

    // Get model names
    const models = await db.select().from(schema.models);
    const modelMap = new Map(models.map(m => [m.id, m.displayName]));

    // Build comparisons
    const comparisons: TemporalComparison[] = currentRankings.map(current => {
      const previous = previousMap.get(current.modelId);
      const deltaAbsolute = previous ? current.score - previous.score : 0;
      const deltaPercentage = previous && previous.score > 0
        ? ((current.score - previous.score) / previous.score) * 100
        : 0;
      const positionChange = previous
        ? previous.position - current.position // Positive = improved
        : null;

      // Determine trend direction
      let trend: TrendDirection = 'stable';
      if (deltaAbsolute > 1) trend = 'up';
      else if (deltaAbsolute < -1) trend = 'down';

      return {
        modelId: current.modelId,
        modelName: modelMap.get(current.modelId) ?? 'Unknown',
        periodType: period,
        currentScore: current.score,
        previousScore: previous?.score ?? 0,
        deltaAbsolute,
        deltaPercentage: Math.round(deltaPercentage * 100) / 100,
        currentPosition: current.position,
        previousPosition: previous?.position ?? null,
        positionChange,
        trend,
      };
    });

    // Sort by current position
    return comparisons.sort((a, b) => a.currentPosition - b.currentPosition);
  }

  /**
   * Get score and position trend for a specific model
   */
  async getModelTrend(modelId: string, limit: number = 10): Promise<ModelTrend | null> {
    // Verify model exists
    const [model] = await db
      .select()
      .from(schema.models)
      .where(eq(schema.models.id, modelId));

    if (!model) {
      return null;
    }

    // Get global rankings for this model from recent runs
    const rankings = await db
      .select({
        runId: schema.rankings.runId,
        score: schema.rankings.score,
        position: schema.rankings.position,
        createdAt: schema.rankings.createdAt,
      })
      .from(schema.rankings)
      .where(
        and(
          eq(schema.rankings.modelId, modelId),
          eq(schema.rankings.rankingType, 'global')
        )
      )
      .orderBy(desc(schema.rankings.createdAt))
      .limit(limit);

    return {
      modelId,
      modelName: model.displayName,
      scores: rankings.map(r => ({
        runId: r.runId,
        date: r.createdAt.toISOString(),
        score: r.score,
        position: r.position,
      })),
    };
  }

  /**
   * Get trends for all active models (for chart visualization)
   */
  async getAllModelTrends(limit: number = 10): Promise<ModelTrend[]> {
    const models = await db
      .select()
      .from(schema.models)
      .where(eq(schema.models.status, 'active'));

    const trends: ModelTrend[] = [];

    for (const model of models) {
      const trend = await this.getModelTrend(model.id, limit);
      if (trend && trend.scores.length > 0) {
        trends.push(trend);
      }
    }

    return trends;
  }
}

// Singleton instance
let analyzerInstance: TemporalAnalyzer | null = null;

/**
 * Get the singleton temporal analyzer instance
 */
export function getTemporalAnalyzer(): TemporalAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new TemporalAnalyzer();
  }
  return analyzerInstance;
}
