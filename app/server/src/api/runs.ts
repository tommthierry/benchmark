// Runs API - Benchmark run management endpoints
// Handles run creation, monitoring, results, and cancellation

import { Router } from 'express';
import { eq, desc, inArray } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { getBenchmarkRunner } from '../services/benchmark-runner.js';
import {
  startBenchmarkRunSchema,
  benchmarkRunQuerySchema,
  runIdParamSchema,
} from '@sabe/shared';

const router = Router();

/**
 * GET /api/runs
 * List benchmark runs with pagination and optional status filter
 */
router.get('/', async (req, res, next) => {
  try {
    const parsed = benchmarkRunQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: parsed.error.flatten(),
      });
    }

    const { limit, offset, status } = parsed.data;

    // Build query with optional status filter
    const baseQuery = status
      ? db
          .select()
          .from(schema.benchmarkRuns)
          .where(eq(schema.benchmarkRuns.status, status))
      : db.select().from(schema.benchmarkRuns);

    const runs = await baseQuery
      .orderBy(desc(schema.benchmarkRuns.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const countQuery = status
      ? db
          .select({ id: schema.benchmarkRuns.id })
          .from(schema.benchmarkRuns)
          .where(eq(schema.benchmarkRuns.status, status))
      : db.select({ id: schema.benchmarkRuns.id }).from(schema.benchmarkRuns);

    const totalRecords = await countQuery;

    res.json({
      data: runs,
      pagination: {
        limit,
        offset,
        total: totalRecords.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/runs
 * Start a new benchmark run
 * Returns immediately with runId, execution happens asynchronously
 */
router.post('/', async (req, res, next) => {
  try {
    const parsed = startBenchmarkRunSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }

    const runner = getBenchmarkRunner();
    const runId = await runner.startRun(parsed.data);

    res.status(202).json({
      message: 'Benchmark run started',
      runId,
    });
  } catch (error) {
    // Handle specific errors
    if ((error as Error).message.includes('No active models')) {
      return res.status(400).json({
        error: 'No active models found for benchmark',
      });
    }
    if ((error as Error).message.includes('No active questions')) {
      return res.status(400).json({
        error: 'No active questions found for benchmark',
      });
    }
    next(error);
  }
});

/**
 * GET /api/runs/:id
 * Get run details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const parsed = runIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid run ID',
        details: parsed.error.flatten(),
      });
    }

    const [run] = await db
      .select()
      .from(schema.benchmarkRuns)
      .where(eq(schema.benchmarkRuns.id, parsed.data.id));

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json({ data: run });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/runs/:id/progress
 * Get real-time progress for a running benchmark
 */
router.get('/:id/progress', async (req, res, next) => {
  try {
    const parsed = runIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid run ID',
        details: parsed.error.flatten(),
      });
    }

    const runner = getBenchmarkRunner();
    const progress = await runner.getProgress(parsed.data.id);

    if (!progress) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json({ data: progress });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/runs/:id/summary
 * Get summary statistics for a completed run
 */
router.get('/:id/summary', async (req, res, next) => {
  try {
    const parsed = runIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid run ID',
        details: parsed.error.flatten(),
      });
    }

    const runner = getBenchmarkRunner();
    const summary = await runner.getSummary(parsed.data.id);

    if (!summary) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json({ data: summary });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/runs/:id/results
 * Get detailed results (task executions with evaluations)
 */
router.get('/:id/results', async (req, res, next) => {
  try {
    const parsed = runIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid run ID',
        details: parsed.error.flatten(),
      });
    }

    // Verify run exists
    const [run] = await db
      .select({ id: schema.benchmarkRuns.id })
      .from(schema.benchmarkRuns)
      .where(eq(schema.benchmarkRuns.id, parsed.data.id));

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    // Get all task executions for this run
    const executions = await db
      .select()
      .from(schema.taskExecutions)
      .where(eq(schema.taskExecutions.runId, parsed.data.id));

    // Get evaluations for these executions
    const executionIds = executions.map(e => e.id);
    const evaluations = executionIds.length > 0
      ? await db
          .select()
          .from(schema.evaluations)
          .where(inArray(schema.evaluations.executionId, executionIds))
      : [];

    // Build evaluations map for efficient lookup
    const evaluationsMap = new Map(
      evaluations.map(e => [e.executionId, e])
    );

    // Combine executions with their evaluations
    const results = executions.map(exec => ({
      ...exec,
      evaluation: evaluationsMap.get(exec.id) ?? null,
    }));

    res.json({ data: results });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/runs/:id/cancel
 * Cancel a running benchmark
 */
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const parsed = runIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid run ID',
        details: parsed.error.flatten(),
      });
    }

    const runner = getBenchmarkRunner();
    const cancelled = await runner.cancelRun(parsed.data.id);

    if (!cancelled) {
      return res.status(400).json({
        error: 'Cannot cancel run - either not found or not in running state',
      });
    }

    res.json({ message: 'Run cancelled successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
