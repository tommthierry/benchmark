// Execution Configuration API
// GET /api/config - Get current config
// PUT /api/config - Update config

import { Router } from 'express';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

const router = Router();

// Validation schema for config updates
const updateConfigSchema = z.object({
  executionMode: z.enum(['cron', 'manual']).optional(),
  cronExpression: z.string().optional(),
  timezone: z.string().optional(),
  autoStartEnabled: z.boolean().optional(),
  roundsPerSession: z.number().int().min(1).max(100).optional(),
  stepDelayMs: z.number().int().min(500).max(30000).optional(),
});

// GET /api/config - Get current configuration
router.get('/', async (_req, res, next) => {
  try {
    let [config] = await db
      .select()
      .from(schema.executionConfig)
      .where(eq(schema.executionConfig.id, 'default'));

    // Create default config if doesn't exist
    if (!config) {
      const now = new Date();
      await db.insert(schema.executionConfig).values({
        id: 'default',
        updatedAt: now,
      });
      [config] = await db
        .select()
        .from(schema.executionConfig)
        .where(eq(schema.executionConfig.id, 'default'));
    }

    res.json({ data: config });
  } catch (error) {
    next(error);
  }
});

// PUT /api/config - Update configuration
router.put('/', async (req, res, next) => {
  try {
    const validation = updateConfigSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.flatten(),
      });
    }

    // Ensure config record exists
    const [existing] = await db
      .select()
      .from(schema.executionConfig)
      .where(eq(schema.executionConfig.id, 'default'));

    if (!existing) {
      // Create with defaults + updates
      const now = new Date();
      await db.insert(schema.executionConfig).values({
        id: 'default',
        ...validation.data,
        updatedAt: now,
      });
    } else {
      // Update existing
      await db
        .update(schema.executionConfig)
        .set({
          ...validation.data,
          updatedAt: new Date(),
        })
        .where(eq(schema.executionConfig.id, 'default'));
    }

    const [config] = await db
      .select()
      .from(schema.executionConfig)
      .where(eq(schema.executionConfig.id, 'default'));

    res.json({ data: config });
  } catch (error) {
    next(error);
  }
});

export default router;
