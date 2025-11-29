// Question API routes
import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { db, schema } from '../db/index.js';
import {
  createQuestionSchema,
  updateQuestionSchema,
  createQuestionTypeSchema,
  updateQuestionTypeSchema,
} from '@sabe/shared';

const router = Router();

// =============================================================================
// QUESTION TYPES
// =============================================================================

// GET /api/questions/types - List question types
router.get('/types', async (_req, res, next) => {
  try {
    const types = await db.select().from(schema.questionTypes);
    res.json({ data: types });
  } catch (error) {
    next(error);
  }
});

// GET /api/questions/types/:id - Get single question type
router.get('/types/:id', async (req, res, next) => {
  try {
    const [questionType] = await db
      .select()
      .from(schema.questionTypes)
      .where(eq(schema.questionTypes.id, req.params.id));

    if (!questionType) {
      return res.status(404).json({ error: 'Question type not found' });
    }

    res.json({ data: questionType });
  } catch (error) {
    next(error);
  }
});

// POST /api/questions/types - Create question type
router.post('/types', async (req, res, next) => {
  try {
    const parsed = createQuestionTypeSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const questionType = {
      id: uuid(),
      ...parsed.data,
      createdAt: new Date(),
    };

    await db.insert(schema.questionTypes).values(questionType);

    res.status(201).json({ data: questionType });
  } catch (error) {
    next(error);
  }
});

// PUT /api/questions/types/:id - Update question type
router.put('/types/:id', async (req, res, next) => {
  try {
    const parsed = updateQuestionTypeSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const [existing] = await db
      .select()
      .from(schema.questionTypes)
      .where(eq(schema.questionTypes.id, req.params.id));

    if (!existing) {
      return res.status(404).json({ error: 'Question type not found' });
    }

    await db
      .update(schema.questionTypes)
      .set(parsed.data)
      .where(eq(schema.questionTypes.id, req.params.id));

    const [updated] = await db
      .select()
      .from(schema.questionTypes)
      .where(eq(schema.questionTypes.id, req.params.id));

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/questions/types/:id - Delete question type
router.delete('/types/:id', async (req, res, next) => {
  try {
    const [existing] = await db
      .select()
      .from(schema.questionTypes)
      .where(eq(schema.questionTypes.id, req.params.id));

    if (!existing) {
      return res.status(404).json({ error: 'Question type not found' });
    }

    // Check if any questions use this type
    const [question] = await db
      .select()
      .from(schema.questions)
      .where(eq(schema.questions.typeId, req.params.id));

    if (question) {
      return res.status(400).json({
        error: 'Cannot delete question type with existing questions',
      });
    }

    await db.delete(schema.questionTypes).where(eq(schema.questionTypes.id, req.params.id));

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// QUESTIONS
// =============================================================================

// GET /api/questions - List all questions (with optional filters)
router.get('/', async (req, res, next) => {
  try {
    const { typeId, status } = req.query;

    let questions;
    if (typeId) {
      questions = await db
        .select()
        .from(schema.questions)
        .where(eq(schema.questions.typeId, String(typeId)));
    } else if (status) {
      questions = await db
        .select()
        .from(schema.questions)
        .where(eq(schema.questions.status, String(status) as 'active' | 'archived'));
    } else {
      questions = await db.select().from(schema.questions);
    }

    res.json({ data: questions });
  } catch (error) {
    next(error);
  }
});

// GET /api/questions/:id - Get single question
router.get('/:id', async (req, res, next) => {
  try {
    // Skip if this is a "types" route that wasn't matched
    if (req.params.id === 'types') {
      return next();
    }

    const [question] = await db
      .select()
      .from(schema.questions)
      .where(eq(schema.questions.id, req.params.id));

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ data: question });
  } catch (error) {
    next(error);
  }
});

// POST /api/questions - Create question
router.post('/', async (req, res, next) => {
  try {
    const parsed = createQuestionSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    // Verify question type exists
    const [questionType] = await db
      .select()
      .from(schema.questionTypes)
      .where(eq(schema.questionTypes.id, parsed.data.typeId));

    if (!questionType) {
      return res.status(400).json({ error: 'Question type not found' });
    }

    const now = new Date();
    const question = {
      id: uuid(),
      ...parsed.data,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(schema.questions).values(question);

    res.status(201).json({ data: question });
  } catch (error) {
    next(error);
  }
});

// PUT /api/questions/:id - Update question
router.put('/:id', async (req, res, next) => {
  try {
    const parsed = updateQuestionSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const [existing] = await db
      .select()
      .from(schema.questions)
      .where(eq(schema.questions.id, req.params.id));

    if (!existing) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // If updating typeId, verify it exists
    if (parsed.data.typeId) {
      const [questionType] = await db
        .select()
        .from(schema.questionTypes)
        .where(eq(schema.questionTypes.id, parsed.data.typeId));

      if (!questionType) {
        return res.status(400).json({ error: 'Question type not found' });
      }
    }

    // Increment version on update
    const newVersion = existing.version + 1;

    await db
      .update(schema.questions)
      .set({ ...parsed.data, version: newVersion, updatedAt: new Date() })
      .where(eq(schema.questions.id, req.params.id));

    const [updated] = await db
      .select()
      .from(schema.questions)
      .where(eq(schema.questions.id, req.params.id));

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/questions/:id - Delete question
router.delete('/:id', async (req, res, next) => {
  try {
    const [existing] = await db
      .select()
      .from(schema.questions)
      .where(eq(schema.questions.id, req.params.id));

    if (!existing) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await db.delete(schema.questions).where(eq(schema.questions.id, req.params.id));

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
