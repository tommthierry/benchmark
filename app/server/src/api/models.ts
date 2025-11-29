// Model API routes
import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { db, schema } from '../db/index.js';
import { createModelSchema, updateModelSchema, updateModelStatusSchema } from '@sabe/shared';

const router = Router();

// GET /api/models - List all models (with optional filters)
router.get('/', async (req, res, next) => {
  try {
    const { providerId, status } = req.query;

    let models;
    if (providerId && status) {
      models = await db
        .select()
        .from(schema.models)
        .where(
          and(
            eq(schema.models.providerId, String(providerId)),
            eq(schema.models.status, String(status) as 'active' | 'inactive' | 'deprecated')
          )
        );
    } else if (providerId) {
      models = await db
        .select()
        .from(schema.models)
        .where(eq(schema.models.providerId, String(providerId)));
    } else if (status) {
      models = await db
        .select()
        .from(schema.models)
        .where(eq(schema.models.status, String(status) as 'active' | 'inactive' | 'deprecated'));
    } else {
      models = await db.select().from(schema.models);
    }

    res.json({ data: models });
  } catch (error) {
    next(error);
  }
});

// GET /api/models/:id - Get single model
router.get('/:id', async (req, res, next) => {
  try {
    const [model] = await db
      .select()
      .from(schema.models)
      .where(eq(schema.models.id, req.params.id));

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({ data: model });
  } catch (error) {
    next(error);
  }
});

// POST /api/models - Create model
router.post('/', async (req, res, next) => {
  try {
    const parsed = createModelSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    // Verify provider exists
    const [provider] = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.id, parsed.data.providerId));

    if (!provider) {
      return res.status(400).json({ error: 'Provider not found' });
    }

    const now = new Date();
    const model = {
      id: uuid(),
      ...parsed.data,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(schema.models).values(model);

    res.status(201).json({ data: model });
  } catch (error) {
    next(error);
  }
});

// PUT /api/models/:id - Update model
router.put('/:id', async (req, res, next) => {
  try {
    const parsed = updateModelSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const [existing] = await db
      .select()
      .from(schema.models)
      .where(eq(schema.models.id, req.params.id));

    if (!existing) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // If updating providerId, verify provider exists
    if (parsed.data.providerId) {
      const [provider] = await db
        .select()
        .from(schema.providers)
        .where(eq(schema.providers.id, parsed.data.providerId));

      if (!provider) {
        return res.status(400).json({ error: 'Provider not found' });
      }
    }

    await db
      .update(schema.models)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(schema.models.id, req.params.id));

    const [updated] = await db
      .select()
      .from(schema.models)
      .where(eq(schema.models.id, req.params.id));

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/models/:id/status - Toggle model status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const parsed = updateModelStatusSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const [existing] = await db
      .select()
      .from(schema.models)
      .where(eq(schema.models.id, req.params.id));

    if (!existing) {
      return res.status(404).json({ error: 'Model not found' });
    }

    await db
      .update(schema.models)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(schema.models.id, req.params.id));

    const [updated] = await db
      .select()
      .from(schema.models)
      .where(eq(schema.models.id, req.params.id));

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/models/:id - Delete model
router.delete('/:id', async (req, res, next) => {
  try {
    const [existing] = await db
      .select()
      .from(schema.models)
      .where(eq(schema.models.id, req.params.id));

    if (!existing) {
      return res.status(404).json({ error: 'Model not found' });
    }

    await db.delete(schema.models).where(eq(schema.models.id, req.params.id));

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
