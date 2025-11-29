// Rankings API - Ranking data and temporal analysis endpoints
// Provides access to global rankings, per-type rankings, and trends

import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { getTemporalAnalyzer } from '../services/temporal-analyzer.js';
import {
  rankingsByTypeParamsSchema,
  temporalComparisonParamsSchema,
  modelHistoryParamsSchema,
  modelHistoryQuerySchema,
  trendsQuerySchema,
  runRankingsParamsSchema,
  runRankingsQuerySchema,
} from '@sabe/shared';

const router = Router();

/**
 * GET /api/rankings/latest
 * Get latest global rankings
 */
router.get('/latest', async (_req, res, next) => {
  try {
    // Get latest completed run
    const [latestRun] = await db
      .select()
      .from(schema.benchmarkRuns)
      .where(eq(schema.benchmarkRuns.status, 'completed'))
      .orderBy(desc(schema.benchmarkRuns.completedAt))
      .limit(1);

    if (!latestRun) {
      return res.json({ data: [], run: null });
    }

    // Get global rankings for this run
    const rankings = await db
      .select()
      .from(schema.rankings)
      .where(
        and(
          eq(schema.rankings.runId, latestRun.id),
          eq(schema.rankings.rankingType, 'global')
        )
      )
      .orderBy(schema.rankings.position);

    // Get model details for enrichment
    const models = await db.select().from(schema.models);
    const modelMap = new Map(models.map(m => [m.id, m]));

    const enrichedRankings = rankings.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      model: modelMap.get(r.modelId)
        ? {
            id: modelMap.get(r.modelId)!.id,
            displayName: modelMap.get(r.modelId)!.displayName,
            providerModelId: modelMap.get(r.modelId)!.providerModelId,
          }
        : null,
    }));

    res.json({
      data: enrichedRankings,
      run: {
        id: latestRun.id,
        iterationNumber: latestRun.iterationNumber,
        completedAt: latestRun.completedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/rankings/types
 * Get list of available question types for filtering
 */
router.get('/types', async (_req, res, next) => {
  try {
    const types = await db.select().from(schema.questionTypes);
    res.json({
      data: types.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/rankings/by-type/:type
 * Get rankings for a specific question type
 */
router.get('/by-type/:type', async (req, res, next) => {
  try {
    const parsed = rankingsByTypeParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid type parameter',
        details: parsed.error.flatten(),
      });
    }

    const { type: typeName } = parsed.data;

    // Get latest completed run
    const [latestRun] = await db
      .select()
      .from(schema.benchmarkRuns)
      .where(eq(schema.benchmarkRuns.status, 'completed'))
      .orderBy(desc(schema.benchmarkRuns.completedAt))
      .limit(1);

    if (!latestRun) {
      return res.json({ data: [], type: typeName, run: null });
    }

    // Get rankings for this type
    const rankings = await db
      .select()
      .from(schema.rankings)
      .where(
        and(
          eq(schema.rankings.runId, latestRun.id),
          eq(schema.rankings.rankingType, 'by_question_type'),
          eq(schema.rankings.dimension, typeName)
        )
      )
      .orderBy(schema.rankings.position);

    // Enrich with model details
    const models = await db.select().from(schema.models);
    const modelMap = new Map(models.map(m => [m.id, m]));

    const enrichedRankings = rankings.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      model: modelMap.get(r.modelId)
        ? {
            id: modelMap.get(r.modelId)!.id,
            displayName: modelMap.get(r.modelId)!.displayName,
            providerModelId: modelMap.get(r.modelId)!.providerModelId,
          }
        : null,
    }));

    res.json({
      data: enrichedRankings,
      type: typeName,
      run: {
        id: latestRun.id,
        iterationNumber: latestRun.iterationNumber,
        completedAt: latestRun.completedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/rankings/compare/:period
 * Compare rankings over a time period (wow, mom, qoq, yoy)
 */
router.get('/compare/:period', async (req, res, next) => {
  try {
    const parsed = temporalComparisonParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid period. Use: wow, mom, qoq, or yoy',
        details: parsed.error.flatten(),
      });
    }

    const analyzer = getTemporalAnalyzer();
    const comparisons = await analyzer.compare(parsed.data.period);

    res.json({
      data: comparisons,
      period: parsed.data.period,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/rankings/history/:modelId
 * Get ranking history for a specific model
 */
router.get('/history/:modelId', async (req, res, next) => {
  try {
    const paramsResult = modelHistoryParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'Invalid model ID',
        details: paramsResult.error.flatten(),
      });
    }

    const queryResult = modelHistoryQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: queryResult.error.flatten(),
      });
    }

    const analyzer = getTemporalAnalyzer();
    const trend = await analyzer.getModelTrend(
      paramsResult.data.modelId,
      queryResult.data.limit
    );

    if (!trend) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({ data: trend });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/rankings/trends
 * Get score trends for all active models (for charts)
 */
router.get('/trends', async (req, res, next) => {
  try {
    const parsed = trendsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: parsed.error.flatten(),
      });
    }

    const analyzer = getTemporalAnalyzer();
    const trends = await analyzer.getAllModelTrends(parsed.data.limit);

    res.json({ data: trends });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/rankings/run/:runId
 * Get rankings for a specific run
 */
router.get('/run/:runId', async (req, res, next) => {
  try {
    const paramsResult = runRankingsParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'Invalid run ID',
        details: paramsResult.error.flatten(),
      });
    }

    const queryResult = runRankingsQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: queryResult.error.flatten(),
      });
    }

    const { runId } = paramsResult.data;
    const { type, dimension } = queryResult.data;

    // Verify run exists
    const [run] = await db
      .select()
      .from(schema.benchmarkRuns)
      .where(eq(schema.benchmarkRuns.id, runId));

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    // Build query conditions
    const conditions = [
      eq(schema.rankings.runId, runId),
      eq(schema.rankings.rankingType, type),
    ];

    // Add dimension filter if provided (for by_question_type)
    if (dimension) {
      conditions.push(eq(schema.rankings.dimension, dimension));
    }

    const rankings = await db
      .select()
      .from(schema.rankings)
      .where(and(...conditions))
      .orderBy(schema.rankings.position);

    // Enrich with model details
    const models = await db.select().from(schema.models);
    const modelMap = new Map(models.map(m => [m.id, m]));

    const enrichedRankings = rankings.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      model: modelMap.get(r.modelId)
        ? {
            id: modelMap.get(r.modelId)!.id,
            displayName: modelMap.get(r.modelId)!.displayName,
            providerModelId: modelMap.get(r.modelId)!.providerModelId,
          }
        : null,
    }));

    res.json({
      data: enrichedRankings,
      run: {
        id: run.id,
        iterationNumber: run.iterationNumber,
        completedAt: run.completedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
