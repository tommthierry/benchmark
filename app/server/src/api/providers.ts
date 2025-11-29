// Provider API routes
import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { db, schema } from '../db/index.js';
import { createProviderSchema, updateProviderSchema } from '@sabe/shared';

const router = Router();

// GET /api/providers - List all providers
router.get('/', async (_req, res, next) => {
  try {
    const providers = await db.select().from(schema.providers);
    res.json({ data: providers });
  } catch (error) {
    next(error);
  }
});

// GET /api/providers/:id - Get single provider
router.get('/:id', async (req, res, next) => {
  try {
    const [provider] = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.id, req.params.id));

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({ data: provider });
  } catch (error) {
    next(error);
  }
});

// POST /api/providers - Create provider
router.post('/', async (req, res, next) => {
  try {
    const parsed = createProviderSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const now = new Date();
    const provider = {
      id: uuid(),
      ...parsed.data,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(schema.providers).values(provider);

    res.status(201).json({ data: provider });
  } catch (error) {
    next(error);
  }
});

// PUT /api/providers/:id - Update provider
router.put('/:id', async (req, res, next) => {
  try {
    const parsed = updateProviderSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const [existing] = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.id, req.params.id));

    if (!existing) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    await db
      .update(schema.providers)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(schema.providers.id, req.params.id));

    const [updated] = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.id, req.params.id));

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/providers/:id - Delete provider
router.delete('/:id', async (req, res, next) => {
  try {
    const [existing] = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.id, req.params.id));

    if (!existing) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    await db
      .delete(schema.providers)
      .where(eq(schema.providers.id, req.params.id));

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
