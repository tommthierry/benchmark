// Schedule API Routes - Manage automated benchmark scheduling
// Provides endpoints to control and monitor the scheduler

import { Router } from 'express';
import { z } from 'zod';
import { getScheduler, type ScheduleConfig, type ScheduleEntry } from '../scheduler/index.js';
import { getBenchmarkRunner } from '../services/benchmark-runner.js';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

const router = Router();

// Validation schemas
const scheduleEntrySchema = z.object({
  enabled: z.boolean().optional(),
  cron: z.string().optional(),
  modelIds: z.array(z.string().uuid()).optional(),
  questionIds: z.array(z.string().uuid()).optional(),
});

const updateScheduleSchema = z.object({
  weekly: scheduleEntrySchema.optional(),
  monthly: scheduleEntrySchema.optional(),
});

const triggerTypeSchema = z.enum(['weekly', 'monthly']);

/**
 * GET /api/schedule
 * Get current scheduler status and configuration
 */
router.get('/', (_req, res) => {
  const scheduler = getScheduler();
  const status = scheduler.getStatus();

  res.json({ data: status });
});

/**
 * POST /api/schedule/start
 * Start the scheduler
 */
router.post('/start', (_req, res) => {
  const scheduler = getScheduler();

  if (scheduler.isSchedulerRunning()) {
    return res.status(400).json({
      error: 'Scheduler already running',
    });
  }

  scheduler.start();

  res.json({
    message: 'Scheduler started',
    data: scheduler.getStatus(),
  });
});

/**
 * POST /api/schedule/stop
 * Stop the scheduler
 */
router.post('/stop', (_req, res) => {
  const scheduler = getScheduler();

  if (!scheduler.isSchedulerRunning()) {
    return res.status(400).json({
      error: 'Scheduler not running',
    });
  }

  scheduler.stop();

  res.json({
    message: 'Scheduler stopped',
    data: scheduler.getStatus(),
  });
});

/**
 * PUT /api/schedule
 * Update schedule configuration
 */
router.put('/', (req, res, next) => {
  try {
    const validation = updateScheduleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const scheduler = getScheduler();
    scheduler.updateConfig(validation.data as Partial<ScheduleConfig>);

    res.json({
      message: 'Schedule updated',
      data: scheduler.getStatus(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/schedule/trigger/:type
 * Manually trigger a scheduled run
 */
router.post('/trigger/:type', async (req, res, next) => {
  try {
    const typeValidation = triggerTypeSchema.safeParse(req.params.type);

    if (!typeValidation.success) {
      return res.status(400).json({
        error: 'Invalid schedule type',
        details: 'Type must be "weekly" or "monthly"',
      });
    }

    const type = typeValidation.data;
    const scheduler = getScheduler();

    // Trigger the run
    const runId = await scheduler.triggerRun(type);

    logger.info({ type, runId }, 'Manual schedule trigger');

    res.status(201).json({
      message: `${type} benchmark triggered`,
      data: { runId },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/schedule/validate
 * Validate a cron expression
 */
router.get('/validate', (req, res) => {
  const { cron: cronExpression } = req.query;

  if (!cronExpression || typeof cronExpression !== 'string') {
    return res.status(400).json({
      error: 'Missing cron query parameter',
    });
  }

  // Import node-cron to validate
  import('node-cron').then(({ validate }) => {
    const isValid = validate(cronExpression);

    res.json({
      data: {
        expression: cronExpression,
        valid: isValid,
      },
    });
  }).catch(() => {
    res.status(500).json({
      error: 'Failed to validate cron expression',
    });
  });
});

export default router;
