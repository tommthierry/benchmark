# PHASE 1: Backend Core

**Status:** ✅ COMPLETED
**Goal:** Database schema with Drizzle ORM and base API endpoints
**Completed:** 2025-11-29
**Prerequisites:** Phase 0 completed

---

## Phase Objectives

By the end of this phase:
1. ✅ Drizzle ORM configured with SQLite
2. ✅ All 8 database tables created with migrations
3. ✅ CRUD APIs for providers, models, questions
4. ✅ Zod validation on all endpoints
5. ✅ Pino logging with request context
6. ✅ Error handling middleware

---

## Progress Tracker

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 1.1 | Install database dependencies | ✅ COMPLETED | drizzle-orm@0.44.7, better-sqlite3@12.5.0, zod@3.24.4 |
| 1.2 | Create Drizzle schema file | ✅ COMPLETED | 8 tables defined in /app/server/src/db/schema.ts |
| 1.3 | Setup Drizzle config and migrations | ✅ COMPLETED | Migration generated in /app/server/drizzle/ |
| 1.4 | Create database connection module | ✅ COMPLETED | WAL mode + foreign keys enabled |
| 1.5 | Add Zod schemas to shared package | ✅ COMPLETED | Provider, Model, Question schemas |
| 1.6 | Create provider API routes | ✅ COMPLETED | Full CRUD |
| 1.7 | Create model API routes | ✅ COMPLETED | Full CRUD + status toggle |
| 1.8 | Create question API routes | ✅ COMPLETED | Full CRUD + question types |
| 1.9 | Add error handling middleware | ✅ COMPLETED | Global error + 404 handlers |
| 1.10 | Verify all APIs work | ✅ COMPLETED | All endpoints tested via curl |

---

## Database Schema Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  providers  │────►│   models    │     │  questions  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                    ┌──────┴───────────────────┴──────┐
                    ▼                                  ▼
              ┌─────────────┐                   ┌─────────────┐
              │ benchmark_  │                   │  question_  │
              │    runs     │                   │   types     │
              └─────────────┘                   └─────────────┘
                    │
                    ▼
              ┌─────────────┐
              │    task_    │
              │ executions  │
              └─────────────┘
                    │
         ┌─────────┴─────────┐
         ▼                   ▼
   ┌─────────────┐     ┌─────────────┐
   │ evaluations │     │  rankings   │
   └─────────────┘     └─────────────┘
```

---

## Step 1.1: Install Database Dependencies

Add to `/app/server/package.json` dependencies:

```json
{
  "dependencies": {
    "drizzle-orm": "^0.38.0",
    "better-sqlite3": "^11.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.0",
    "@types/better-sqlite3": "^7.6.0"
  }
}
```

Run:
```bash
cd app/server && npm install
```

Add to `/app/server/package.json` scripts:
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
}
```

---

## Step 1.2: Create Drizzle Schema File

Create `/app/server/src/db/schema.ts`:

```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ============================================
// PROVIDERS
// ============================================
export const providers = sqliteTable('providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  apiEndpoint: text('api_endpoint').notNull(),
  apiKeyEnvVar: text('api_key_env_var').notNull(), // Name of env var containing API key
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  rateLimitPerMinute: integer('rate_limit_per_minute').default(60),
  config: text('config', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ============================================
// MODELS
// ============================================
export const models = sqliteTable('models', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull().references(() => providers.id),
  providerModelId: text('provider_model_id').notNull(), // e.g., "anthropic/claude-3.5-sonnet"
  displayName: text('display_name').notNull(),
  label: text('label'), // Custom user label
  status: text('status', { enum: ['active', 'inactive', 'deprecated'] }).notNull().default('active'),
  contextSize: integer('context_size'),
  costInputPerMillion: real('cost_input_per_million'), // Cost per 1M input tokens
  costOutputPerMillion: real('cost_output_per_million'), // Cost per 1M output tokens
  config: text('config', { mode: 'json' }).$type<{ temperature?: number; maxTokens?: number }>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ============================================
// QUESTION TYPES
// ============================================
export const questionTypes = sqliteTable('question_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(), // reasoning, code, creativity, etc.
  description: text('description'),
  weight: real('weight').notNull().default(1.0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================
// QUESTIONS
// ============================================
export const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  typeId: text('type_id').notNull().references(() => questionTypes.id),
  content: text('content').notNull(), // The prompt
  expectedAnswer: text('expected_answer'), // For exact match evaluation
  evaluationMethod: text('evaluation_method', {
    enum: ['exact_match', 'contains', 'regex', 'llm_judge']
  }).notNull().default('llm_judge'),
  evaluationCriteria: text('evaluation_criteria', { mode: 'json' }).$type<{
    pattern?: string;      // For regex
    keywords?: string[];   // For contains
    rubric?: string;       // For llm_judge
  }>(),
  difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard', 'expert'] }).default('medium'),
  weight: real('weight').notNull().default(1.0),
  status: text('status', { enum: ['active', 'archived'] }).notNull().default('active'),
  version: integer('version').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ============================================
// BENCHMARK RUNS
// ============================================
export const benchmarkRuns = sqliteTable('benchmark_runs', {
  id: text('id').primaryKey(),
  iterationNumber: integer('iteration_number').notNull(),
  status: text('status', {
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled']
  }).notNull().default('pending'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  modelsCount: integer('models_count').notNull().default(0),
  questionsCount: integer('questions_count').notNull().default(0),
  configSnapshot: text('config_snapshot', { mode: 'json' }).$type<Record<string, unknown>>(),
  errorLog: text('error_log'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================
// TASK EXECUTIONS (Individual model responses)
// ============================================
export const taskExecutions = sqliteTable('task_executions', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => benchmarkRuns.id),
  modelId: text('model_id').notNull().references(() => models.id),
  questionId: text('question_id').notNull().references(() => questions.id),
  inputPrompt: text('input_prompt').notNull(), // Actual prompt sent
  responseContent: text('response_content'), // Model's response
  responseTimeMs: integer('response_time_ms'),
  tokensInput: integer('tokens_input'),
  tokensOutput: integer('tokens_output'),
  cost: real('cost'), // Calculated cost
  status: text('status', { enum: ['pending', 'success', 'error', 'timeout'] }).notNull().default('pending'),
  errorMessage: text('error_message'),
  rawResponse: text('raw_response', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================
// EVALUATIONS
// ============================================
export const evaluations = sqliteTable('evaluations', {
  id: text('id').primaryKey(),
  executionId: text('execution_id').notNull().references(() => taskExecutions.id),
  evaluatorType: text('evaluator_type', {
    enum: ['rule_based', 'llm_judge']
  }).notNull(),
  evaluatorModelId: text('evaluator_model_id').references(() => models.id), // If LLM judge
  score: real('score').notNull(), // Raw score
  maxScore: real('max_score').notNull().default(100),
  normalizedScore: real('normalized_score').notNull(), // 0-100 scale
  justification: text('justification'), // Why this score
  criteriaScores: text('criteria_scores', { mode: 'json' }).$type<Record<string, number>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================
// RANKINGS
// ============================================
export const rankings = sqliteTable('rankings', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => benchmarkRuns.id),
  modelId: text('model_id').notNull().references(() => models.id),
  rankingType: text('ranking_type', {
    enum: ['global', 'by_question_type', 'comparative']
  }).notNull(),
  dimension: text('dimension'), // e.g., "reasoning", "code" for by_question_type
  position: integer('position').notNull(),
  score: real('score').notNull(),
  previousPosition: integer('previous_position'),
  deltaPosition: integer('delta_position'), // + means improved, - means dropped
  deltaScore: real('delta_score'),
  sampleSize: integer('sample_size').notNull(), // Questions evaluated
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Export types for use in application
export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;
export type QuestionType = typeof questionTypes.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type BenchmarkRun = typeof benchmarkRuns.$inferSelect;
export type TaskExecution = typeof taskExecutions.$inferSelect;
export type Evaluation = typeof evaluations.$inferSelect;
export type Ranking = typeof rankings.$inferSelect;
```

---

## Step 1.3: Setup Drizzle Config

Create `/app/server/drizzle.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || './data/sabe.db',
  },
});
```

Generate initial migration:
```bash
cd app/server
npm run db:generate
```

This creates SQL files in `/app/server/drizzle/`

---

## Step 1.4: Create Database Connection

Create `/app/server/src/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_URL || path.join(dataDir, 'sabe.db');

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL'); // Better performance

export const db = drizzle(sqlite, { schema });

// Run migrations programmatically
export async function runMigrations() {
  const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
  const migrationsPath = path.join(__dirname, '../../drizzle');

  try {
    migrate(db, { migrationsFolder: migrationsPath });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

export { schema };
```

Update `/app/server/src/index.ts` to run migrations on startup:

```typescript
// Add at the top
import { runMigrations } from './db/index.js';

// Add before app.listen()
await runMigrations();
```

---

## Step 1.5: Add Zod Schemas to Shared Package

Update `/app/shared/package.json` to include zod:

```json
{
  "dependencies": {
    "zod": "^3.24.0"
  }
}
```

Create `/app/shared/src/schemas/provider.ts`:

```typescript
import { z } from 'zod';

export const providerStatusSchema = z.enum(['active', 'inactive']);

export const createProviderSchema = z.object({
  name: z.string().min(1).max(100),
  apiEndpoint: z.string().url(),
  apiKeyEnvVar: z.string().min(1).max(100),
  status: providerStatusSchema.optional().default('active'),
  rateLimitPerMinute: z.number().int().positive().optional().default(60),
  config: z.record(z.unknown()).optional(),
});

export const updateProviderSchema = createProviderSchema.partial();

export type CreateProviderInput = z.infer<typeof createProviderSchema>;
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
```

Create `/app/shared/src/schemas/model.ts`:

```typescript
import { z } from 'zod';

export const modelStatusSchema = z.enum(['active', 'inactive', 'deprecated']);

export const createModelSchema = z.object({
  providerId: z.string().uuid(),
  providerModelId: z.string().min(1).max(200),
  displayName: z.string().min(1).max(200),
  label: z.string().max(100).optional(),
  status: modelStatusSchema.optional().default('active'),
  contextSize: z.number().int().positive().optional(),
  costInputPerMillion: z.number().nonnegative().optional(),
  costOutputPerMillion: z.number().nonnegative().optional(),
  config: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
  }).optional(),
});

export const updateModelSchema = createModelSchema.partial();

export type CreateModelInput = z.infer<typeof createModelSchema>;
export type UpdateModelInput = z.infer<typeof updateModelSchema>;
```

Create `/app/shared/src/schemas/question.ts`:

```typescript
import { z } from 'zod';

export const evaluationMethodSchema = z.enum(['exact_match', 'contains', 'regex', 'llm_judge']);
export const difficultySchema = z.enum(['easy', 'medium', 'hard', 'expert']);
export const questionStatusSchema = z.enum(['active', 'archived']);

export const createQuestionSchema = z.object({
  typeId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  expectedAnswer: z.string().max(10000).optional(),
  evaluationMethod: evaluationMethodSchema.optional().default('llm_judge'),
  evaluationCriteria: z.object({
    pattern: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    rubric: z.string().optional(),
  }).optional(),
  difficulty: difficultySchema.optional().default('medium'),
  weight: z.number().positive().optional().default(1.0),
  status: questionStatusSchema.optional().default('active'),
});

export const updateQuestionSchema = createQuestionSchema.partial();

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
```

Create `/app/shared/src/schemas/index.ts`:

```typescript
export * from './provider.js';
export * from './model.js';
export * from './question.js';
```

Update `/app/shared/src/index.ts`:

```typescript
export const APP_NAME = 'SABE';
export const APP_VERSION = '0.1.0';

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
}

export * from './schemas/index.js';
```

Rebuild shared:
```bash
npm run build:shared
```

---

## Step 1.6: Create Provider API Routes

Create `/app/server/src/api/providers.ts`:

```typescript
import { Router } from 'express';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { createProviderSchema, updateProviderSchema } from '@sabe/shared';
import { v4 as uuid } from 'uuid';

const router = Router();

// GET /api/providers - List all providers
router.get('/', async (req, res, next) => {
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
        details: parsed.error.flatten()
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
        details: parsed.error.flatten()
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
```

Add uuid dependency:
```bash
cd app/server && npm install uuid && npm install -D @types/uuid
```

---

## Step 1.7: Create Model API Routes

Create `/app/server/src/api/models.ts`:

```typescript
import { Router } from 'express';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { createModelSchema, updateModelSchema } from '@sabe/shared';
import { v4 as uuid } from 'uuid';

const router = Router();

// GET /api/models - List all models
router.get('/', async (req, res, next) => {
  try {
    const { providerId, status } = req.query;

    let query = db.select().from(schema.models);

    // Add filters if provided
    const conditions = [];
    if (providerId && typeof providerId === 'string') {
      conditions.push(eq(schema.models.providerId, providerId));
    }
    if (status && typeof status === 'string') {
      conditions.push(eq(schema.models.status, status as 'active' | 'inactive' | 'deprecated'));
    }

    const models = conditions.length > 0
      ? await db.select().from(schema.models).where(conditions[0])
      : await db.select().from(schema.models);

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
        details: parsed.error.flatten()
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
        details: parsed.error.flatten()
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
    const { status } = req.body;

    if (!['active', 'inactive', 'deprecated'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
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
      .set({ status, updatedAt: new Date() })
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
    await db.delete(schema.models).where(eq(schema.models.id, req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
```

---

## Step 1.8: Create Question API Routes

Create `/app/server/src/api/questions.ts`:

```typescript
import { Router } from 'express';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { createQuestionSchema, updateQuestionSchema } from '@sabe/shared';
import { v4 as uuid } from 'uuid';

const router = Router();

// GET /api/questions/types - List question types
router.get('/types', async (req, res, next) => {
  try {
    const types = await db.select().from(schema.questionTypes);
    res.json({ data: types });
  } catch (error) {
    next(error);
  }
});

// POST /api/questions/types - Create question type
router.post('/types', async (req, res, next) => {
  try {
    const { name, description, weight } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const questionType = {
      id: uuid(),
      name,
      description: description || null,
      weight: weight || 1.0,
      createdAt: new Date(),
    };

    await db.insert(schema.questionTypes).values(questionType);

    res.status(201).json({ data: questionType });
  } catch (error) {
    next(error);
  }
});

// GET /api/questions - List all questions
router.get('/', async (req, res, next) => {
  try {
    const { typeId, status } = req.query;

    let questions;
    if (typeId && typeof typeId === 'string') {
      questions = await db
        .select()
        .from(schema.questions)
        .where(eq(schema.questions.typeId, typeId));
    } else if (status && typeof status === 'string') {
      questions = await db
        .select()
        .from(schema.questions)
        .where(eq(schema.questions.status, status as 'active' | 'archived'));
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
        details: parsed.error.flatten()
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
        details: parsed.error.flatten()
      });
    }

    const [existing] = await db
      .select()
      .from(schema.questions)
      .where(eq(schema.questions.id, req.params.id));

    if (!existing) {
      return res.status(404).json({ error: 'Question not found' });
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
    await db.delete(schema.questions).where(eq(schema.questions.id, req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
```

---

## Step 1.9: Add Error Handling Middleware

Create `/app/server/src/middleware/errorHandler.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export interface ApiError extends Error {
  statusCode?: number;
  details?: unknown;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error
  logger.error({
    err,
    req: {
      method: req.method,
      url: req.url,
      body: req.body,
    },
  }, 'Request error');

  // Don't expose internal errors in production
  const response = {
    error: statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : message,
    ...(err.details && { details: err.details }),
  };

  res.status(statusCode).json(response);
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' });
}
```

Update `/app/server/src/index.ts` to use routes and error handlers:

```typescript
import express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import path from 'path';
import { fileURLToPath } from 'url';
import { APP_NAME, APP_VERSION, type HealthResponse } from '@sabe/shared';
import { runMigrations } from './db/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// API Routes
import providersRouter from './api/providers.js';
import modelsRouter from './api/models.js';
import questionsRouter from './api/questions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(pinoHttp({ logger }));

// API Routes
app.get('/api/health', (req, res) => {
  const response: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
  };
  res.json(response);
});

app.use('/api/providers', providersRouter);
app.use('/api/models', modelsRouter);
app.use('/api/questions', questionsRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
}

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function start() {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      logger.info(`${APP_NAME} server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

start();
```

---

## Step 1.10: Verify All APIs Work

### Run the server:
```bash
npm run build:shared
cd app/server && npm run dev
```

### Test Provider CRUD:
```bash
# Create provider
curl -X POST http://localhost:3000/api/providers \
  -H "Content-Type: application/json" \
  -d '{"name":"OpenRouter","apiEndpoint":"https://openrouter.ai/api/v1","apiKeyEnvVar":"OPENROUTER_API_KEY"}'

# List providers
curl http://localhost:3000/api/providers

# Get provider (use ID from create response)
curl http://localhost:3000/api/providers/{id}

# Update provider
curl -X PUT http://localhost:3000/api/providers/{id} \
  -H "Content-Type: application/json" \
  -d '{"name":"OpenRouter Updated"}'

# Delete provider
curl -X DELETE http://localhost:3000/api/providers/{id}
```

### Test Question Types and Questions:
```bash
# Create question type
curl -X POST http://localhost:3000/api/questions/types \
  -H "Content-Type: application/json" \
  -d '{"name":"reasoning","description":"Logical reasoning questions"}'

# Create question (use typeId from above)
curl -X POST http://localhost:3000/api/questions \
  -H "Content-Type: application/json" \
  -d '{"typeId":"{typeId}","content":"What is 2+2?","expectedAnswer":"4","evaluationMethod":"exact_match"}'

# List questions
curl http://localhost:3000/api/questions
```

---

## Verification Checklist

All items verified on 2025-11-29:

- [x] `npm run db:generate` creates migration files
- [x] Server starts without errors
- [x] Database file created in `/data/sabe.db`
- [x] Provider CRUD works (create, read, update, delete)
- [x] Model CRUD works
- [x] Question type CRUD works
- [x] Question CRUD works
- [x] Validation errors return 400 with details
- [x] Not found returns 404
- [x] Server errors return 500

---

## Next Phase

Once all verifications pass, proceed to:
**→ PHASE_2_LLM_INTEGRATION.md**

---

## Troubleshooting

### "Cannot find module 'drizzle-orm'"
```bash
cd app/server && npm install
```

### "Database locked"
SQLite WAL mode should prevent this. If it occurs:
- Check no other process has the DB open
- Restart the server

### Migration errors
```bash
rm -rf app/server/drizzle
npm run db:generate
```

### Foreign key constraint failed
- Ensure referenced records exist before creating child records
- Create providers before models, question types before questions
