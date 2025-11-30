# Phase 1: Game Flow Engine

## Objective

Implement the core game engine that orchestrates the AI Arena flow: Master selection, question generation, answering rounds, peer judging, and scoring.

## Prerequisites

- Phase 0 completed (Settings/Status separation)
- `executionConfig` table exists and functional
- Manual/cron toggle working

## Progress Tracker

| Step | Task | Status |
|------|------|--------|
| 1.1 | Design and create game session schema | ✅ COMPLETED |
| 1.2 | Design and create round schema | ✅ COMPLETED |
| 1.3 | Design and create step schema | ✅ COMPLETED |
| 1.4 | Design and create judgment schema | ✅ COMPLETED |
| 1.5 | Create GameEngine service | ✅ COMPLETED |
| 1.6 | Implement Master selection logic | ✅ COMPLETED |
| 1.7 | Implement question generation step | ✅ COMPLETED |
| 1.8 | Implement answering phase | ✅ COMPLETED |
| 1.9 | Implement judging phase | ✅ COMPLETED |
| 1.10 | Implement scoring calculation | ✅ COMPLETED |
| 1.11 | Create Arena API endpoints | ✅ COMPLETED |
| 1.12 | Create shared types for game entities | ✅ COMPLETED |
| 1.13 | Add prompt templates for Master/Judge | ✅ COMPLETED |
| 1.14 | Integration testing | ✅ COMPLETED |

**Status Legend:** ⬜ NOT STARTED → 🟡 IN PROGRESS → ✅ COMPLETED

**Phase 1 Completed:** 2025-11-29

---

## Game Flow State Machine

```
                    ┌──────────────────────┐
                    │   SESSION_CREATED    │
                    └──────────┬───────────┘
                               │ startSession()
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         ROUND LOOP                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     ROUND_STARTED                        │   │
│  │  • Select Master (rotating)                              │   │
│  │  • Initialize round record                               │   │
│  └───────────────────────┬──────────────────────────────────┘   │
│                          ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              STEP: MASTER_SELECTING_TOPIC                │   │
│  │  • Master LLM picks from question types pool             │   │
│  └───────────────────────┬──────────────────────────────────┘   │
│                          ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              STEP: MASTER_CREATING_QUESTION              │   │
│  │  • Master LLM generates question on chosen topic         │   │
│  │  • Question stored with round reference                  │   │
│  └───────────────────────┬──────────────────────────────────┘   │
│                          ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              ANSWERING PHASE (loop per model)            │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │         STEP: MODEL_ANSWERING (Model A)            │  │   │
│  │  │  • Model receives question                         │  │   │
│  │  │  • Model generates answer                          │  │   │
│  │  │  • Store response + thinking                       │  │   │
│  │  └───────────────────────┬────────────────────────────┘  │   │
│  │                          │ repeat for each non-master    │   │
│  │                          ▼                               │   │
│  └──────────────────────────┼───────────────────────────────┘   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              JUDGING PHASE (loop per judge)              │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │        STEP: MODEL_JUDGING (Judge A)               │  │   │
│  │  │  • Judge receives question + all answers           │  │   │
│  │  │  • Judge ranks and scores each answer              │  │   │
│  │  │  • Store judgment with reasoning                   │  │   │
│  │  └───────────────────────┬────────────────────────────┘  │   │
│  │                          │ repeat for each model         │   │
│  │                          ▼                               │   │
│  └──────────────────────────┼───────────────────────────────┘   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   ROUND_SCORING                          │   │
│  │  • Aggregate all judgments                               │   │
│  │  • Calculate round scores                                │   │
│  │  • Master breaks ties if needed                          │   │
│  │  • Update session rankings                               │   │
│  └───────────────────────┬──────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│               [Check: more rounds?]                             │
│                    │           │                                │
│                  Yes           No                               │
│                    │           │                                │
│           ┌────────┘           └────────┐                       │
│           ▼                             ▼                       │
│     Next Round                  SESSION_COMPLETED               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1.1: Game Session Schema

### Add to `app/server/src/db/schema.ts`:

```typescript
// =============================================================================
// GAME SESSIONS - Arena session tracking
// =============================================================================
export const gameSessions = sqliteTable('game_sessions', {
  id: text('id').primaryKey(),
  status: text('status', {
    enum: ['created', 'running', 'paused', 'completed', 'failed']
  }).notNull().default('created'),
  totalRounds: integer('total_rounds').notNull().default(5),
  completedRounds: integer('completed_rounds').notNull().default(0),
  currentRoundId: text('current_round_id'),
  participatingModelIds: text('participating_model_ids', { mode: 'json' })
    .$type<string[]>().notNull(),
  config: text('config', { mode: 'json' }).$type<{
    stepDelayMs?: number;
    allowTies?: boolean;
  }>(),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

### Type Export:
```typescript
export type GameSession = typeof gameSessions.$inferSelect;
export type NewGameSession = typeof gameSessions.$inferInsert;
```

---

## Step 1.2: Round Schema

### Add to schema:

```typescript
// =============================================================================
// ROUNDS - Individual rounds within a game session
// =============================================================================
export const rounds = sqliteTable('rounds', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => gameSessions.id),
  roundNumber: integer('round_number').notNull(),
  status: text('status', {
    enum: ['created', 'topic_selection', 'question_creation', 'answering',
           'judging', 'scoring', 'completed', 'failed']
  }).notNull().default('created'),
  masterId: text('master_id').notNull().references(() => models.id),
  topicId: text('topic_id').references(() => questionTypes.id),
  questionContent: text('question_content'),
  questionDifficulty: text('question_difficulty', {
    enum: ['easy', 'medium', 'hard', 'expert']
  }),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

---

## Step 1.3: Step Schema

### Add to schema:

```typescript
// =============================================================================
// ROUND STEPS - Atomic steps within a round
// =============================================================================
export const roundSteps = sqliteTable('round_steps', {
  id: text('id').primaryKey(),
  roundId: text('round_id').notNull().references(() => rounds.id),
  stepNumber: integer('step_number').notNull(),
  stepType: text('step_type', {
    enum: ['master_topic', 'master_question', 'model_answer', 'model_judge', 'scoring']
  }).notNull(),
  status: text('status', {
    enum: ['pending', 'running', 'completed', 'failed', 'skipped']
  }).notNull().default('pending'),
  actorModelId: text('actor_model_id').references(() => models.id),
  targetModelId: text('target_model_id').references(() => models.id), // For judging
  inputData: text('input_data', { mode: 'json' }).$type<Record<string, unknown>>(),
  outputData: text('output_data', { mode: 'json' }).$type<Record<string, unknown>>(),
  llmResponseTimeMs: integer('llm_response_time_ms'),
  llmTokensUsed: integer('llm_tokens_used'),
  errorMessage: text('error_message'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

---

## Step 1.4: Judgment Schema

### Add to schema:

```typescript
// =============================================================================
// MODEL JUDGMENTS - Peer evaluation scores
// =============================================================================
export const modelJudgments = sqliteTable('model_judgments', {
  id: text('id').primaryKey(),
  roundId: text('round_id').notNull().references(() => rounds.id),
  stepId: text('step_id').notNull().references(() => roundSteps.id),
  judgeModelId: text('judge_model_id').notNull().references(() => models.id),
  targetModelId: text('target_model_id').notNull().references(() => models.id),
  score: real('score').notNull(), // 0-100
  rank: integer('rank').notNull(), // Position given by this judge
  reasoning: text('reasoning'), // Judge's explanation
  criteriaScores: text('criteria_scores', { mode: 'json' }).$type<{
    accuracy?: number;
    clarity?: number;
    creativity?: number;
    completeness?: number;
  }>(),
  isMasterJudgment: integer('is_master_judgment', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

---

## Step 1.5: Create GameEngine Service

### Create `app/server/src/services/game-engine.ts`:

```typescript
// Game Engine Service - Orchestrates AI Arena game flow
// Manages sessions, rounds, and step-by-step execution

import { v4 as uuid } from 'uuid';
import pino from 'pino';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { db, schema, type Model } from '../db/index.js';
import { getProviderManager } from './llm/index.js';
import { EventEmitter } from 'events';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

// Event types emitted by game engine
export type GameEvent =
  | { type: 'session_started'; sessionId: string }
  | { type: 'round_started'; roundId: string; roundNumber: number; masterId: string }
  | { type: 'step_started'; stepId: string; stepType: string; actorId: string }
  | { type: 'step_completed'; stepId: string; stepType: string; output: unknown }
  | { type: 'round_completed'; roundId: string; scores: Record<string, number> }
  | { type: 'session_completed'; sessionId: string; finalRankings: unknown[] };

export class GameEngine extends EventEmitter {
  private activeSession: string | null = null;
  private isPaused = false;

  /**
   * Create a new game session
   */
  async createSession(options: {
    totalRounds?: number;
    modelIds?: string[];
    stepDelayMs?: number;
  } = {}): Promise<string> {
    const sessionId = uuid();
    const now = new Date();

    // Get participating models
    const allActiveModels = await db
      .select()
      .from(schema.models)
      .where(eq(schema.models.status, 'active'));

    const participatingModels = options.modelIds
      ? allActiveModels.filter(m => options.modelIds!.includes(m.id))
      : allActiveModels;

    if (participatingModels.length < 2) {
      throw new Error('Need at least 2 active models for a game session');
    }

    await db.insert(schema.gameSessions).values({
      id: sessionId,
      status: 'created',
      totalRounds: options.totalRounds ?? 5,
      participatingModelIds: participatingModels.map(m => m.id),
      config: {
        stepDelayMs: options.stepDelayMs ?? 2000,
      },
      createdAt: now,
    });

    logger.info({
      sessionId,
      totalRounds: options.totalRounds ?? 5,
      modelCount: participatingModels.length,
    }, 'Game session created');

    return sessionId;
  }

  /**
   * Start or resume a game session
   */
  async startSession(sessionId: string): Promise<void> {
    const [session] = await db
      .select()
      .from(schema.gameSessions)
      .where(eq(schema.gameSessions.id, sessionId));

    if (!session) {
      throw new Error('Session not found');
    }

    if (this.activeSession) {
      throw new Error('Another session is already running');
    }

    this.activeSession = sessionId;
    this.isPaused = false;

    await db
      .update(schema.gameSessions)
      .set({ status: 'running', startedAt: new Date() })
      .where(eq(schema.gameSessions.id, sessionId));

    this.emit('event', { type: 'session_started', sessionId });

    // Start the game loop
    try {
      await this.runGameLoop(session);
    } catch (error) {
      logger.error({ sessionId, error }, 'Game loop failed');
      await this.failSession(sessionId, (error as Error).message);
    }
  }

  /**
   * Execute one step manually (for manual mode)
   */
  async executeNextStep(sessionId: string): Promise<RoundStep | null> {
    // Implementation for manual step execution
    // Returns the executed step or null if session complete
  }

  /**
   * Pause the game session
   */
  async pauseSession(sessionId: string): Promise<void> {
    this.isPaused = true;
    await db
      .update(schema.gameSessions)
      .set({ status: 'paused' })
      .where(eq(schema.gameSessions.id, sessionId));
  }

  // ... additional methods below
}

// Singleton
let engineInstance: GameEngine | null = null;

export function getGameEngine(): GameEngine {
  if (!engineInstance) {
    engineInstance = new GameEngine();
  }
  return engineInstance;
}
```

---

## Step 1.6: Master Selection Logic

### Add to GameEngine:

```typescript
/**
 * Select the master for a round
 * Uses rotating selection based on round number
 */
private selectMaster(
  modelIds: string[],
  roundNumber: number
): string {
  // Rotate through models: round 1 = model 0, round 2 = model 1, etc.
  const masterIndex = (roundNumber - 1) % modelIds.length;
  return modelIds[masterIndex];
}

/**
 * Start a new round
 */
private async startRound(
  sessionId: string,
  roundNumber: number,
  modelIds: string[]
): Promise<string> {
  const roundId = uuid();
  const masterId = this.selectMaster(modelIds, roundNumber);
  const now = new Date();

  await db.insert(schema.rounds).values({
    id: roundId,
    sessionId,
    roundNumber,
    status: 'created',
    masterId,
    createdAt: now,
  });

  // Update session with current round
  await db
    .update(schema.gameSessions)
    .set({ currentRoundId: roundId })
    .where(eq(schema.gameSessions.id, sessionId));

  this.emit('event', {
    type: 'round_started',
    roundId,
    roundNumber,
    masterId,
  });

  logger.info({ roundId, roundNumber, masterId }, 'Round started');

  return roundId;
}
```

---

## Step 1.7: Question Generation Step

### Add to GameEngine:

```typescript
/**
 * Master selects a topic and generates a question
 */
private async executeMasterQuestionStep(
  roundId: string,
  masterId: string
): Promise<void> {
  const providerManager = await getProviderManager();

  // Get master model details
  const [master] = await db
    .select()
    .from(schema.models)
    .where(eq(schema.models.id, masterId));

  // Get available topics
  const topics = await db.select().from(schema.questionTypes);

  // STEP 1: Topic Selection
  const topicStepId = uuid();
  await this.createStep(roundId, topicStepId, 'master_topic', masterId);

  const topicPrompt = this.buildTopicSelectionPrompt(topics);
  const topicResponse = await providerManager.sendPrompt(
    master.providerId,
    master.providerModelId,
    topicPrompt,
    { temperature: 0.7, maxTokens: 200 }
  );

  const selectedTopicId = this.parseTopicSelection(topicResponse.content, topics);

  await this.completeStep(topicStepId, {
    selectedTopicId,
    reasoning: topicResponse.content,
  });

  // Update round with selected topic
  await db
    .update(schema.rounds)
    .set({ topicId: selectedTopicId, status: 'question_creation' })
    .where(eq(schema.rounds.id, roundId));

  // STEP 2: Question Creation
  const questionStepId = uuid();
  await this.createStep(roundId, questionStepId, 'master_question', masterId);

  const [topic] = await db
    .select()
    .from(schema.questionTypes)
    .where(eq(schema.questionTypes.id, selectedTopicId));

  const questionPrompt = this.buildQuestionCreationPrompt(topic);
  const questionResponse = await providerManager.sendPrompt(
    master.providerId,
    master.providerModelId,
    questionPrompt,
    { temperature: 0.8, maxTokens: 500 }
  );

  const { question, difficulty } = this.parseQuestionCreation(questionResponse.content);

  await this.completeStep(questionStepId, {
    question,
    difficulty,
  });

  // Update round with question
  await db
    .update(schema.rounds)
    .set({
      questionContent: question,
      questionDifficulty: difficulty,
      status: 'answering',
    })
    .where(eq(schema.rounds.id, roundId));
}
```

---

## Step 1.8: Answering Phase

### Add to GameEngine:

```typescript
/**
 * Execute answering phase - each non-master model answers
 */
private async executeAnsweringPhase(
  roundId: string,
  masterId: string,
  modelIds: string[],
  question: string
): Promise<void> {
  const providerManager = await getProviderManager();
  const respondingModels = modelIds.filter(id => id !== masterId);

  for (const modelId of respondingModels) {
    if (this.isPaused) {
      logger.info({ roundId }, 'Session paused during answering phase');
      return;
    }

    const stepId = uuid();
    await this.createStep(roundId, stepId, 'model_answer', modelId);

    const [model] = await db
      .select()
      .from(schema.models)
      .where(eq(schema.models.id, modelId));

    const answerPrompt = this.buildAnswerPrompt(question);

    try {
      const response = await providerManager.sendPrompt(
        model.providerId,
        model.providerModelId,
        answerPrompt,
        { temperature: 0.7, maxTokens: 1000 }
      );

      await this.completeStep(stepId, {
        answer: response.content,
        tokensUsed: response.tokensInput + response.tokensOutput,
        responseTimeMs: response.responseTimeMs,
      });

      this.emit('event', {
        type: 'step_completed',
        stepId,
        stepType: 'model_answer',
        output: { modelId, answerPreview: response.content.slice(0, 100) },
      });

    } catch (error) {
      await this.failStep(stepId, (error as Error).message);
      logger.error({ stepId, modelId, error }, 'Model failed to answer');
    }

    // Delay between steps (configurable)
    await this.stepDelay();
  }

  // Update round status
  await db
    .update(schema.rounds)
    .set({ status: 'judging' })
    .where(eq(schema.rounds.id, roundId));
}
```

---

## Step 1.9: Judging Phase

### Add to GameEngine:

```typescript
/**
 * Execute judging phase - each model judges all other answers
 */
private async executeJudgingPhase(
  roundId: string,
  modelIds: string[],
  question: string
): Promise<void> {
  const providerManager = await getProviderManager();

  // Get all answers for this round
  const answers = await db
    .select()
    .from(schema.roundSteps)
    .where(and(
      eq(schema.roundSteps.roundId, roundId),
      eq(schema.roundSteps.stepType, 'model_answer'),
      eq(schema.roundSteps.status, 'completed')
    ));

  // Get round info to identify master
  const [round] = await db
    .select()
    .from(schema.rounds)
    .where(eq(schema.rounds.id, roundId));

  // Each model judges (including master)
  for (const judgeId of modelIds) {
    if (this.isPaused) {
      logger.info({ roundId }, 'Session paused during judging phase');
      return;
    }

    const stepId = uuid();
    await this.createStep(roundId, stepId, 'model_judge', judgeId);

    const [judge] = await db
      .select()
      .from(schema.models)
      .where(eq(schema.models.id, judgeId));

    // Build judging prompt (excludes judge's own answer)
    const answersToJudge = answers.filter(a => a.actorModelId !== judgeId);
    const judgingPrompt = this.buildJudgingPrompt(question, answersToJudge);

    try {
      const response = await providerManager.sendPrompt(
        judge.providerId,
        judge.providerModelId,
        judgingPrompt,
        { temperature: 0.3, maxTokens: 1500 }
      );

      const judgments = this.parseJudgments(response.content, answersToJudge);

      // Store each judgment
      for (const j of judgments) {
        await db.insert(schema.modelJudgments).values({
          id: uuid(),
          roundId,
          stepId,
          judgeModelId: judgeId,
          targetModelId: j.modelId,
          score: j.score,
          rank: j.rank,
          reasoning: j.reasoning,
          criteriaScores: j.criteriaScores,
          isMasterJudgment: judgeId === round.masterId,
          createdAt: new Date(),
        });
      }

      await this.completeStep(stepId, { judgments });

    } catch (error) {
      await this.failStep(stepId, (error as Error).message);
      logger.error({ stepId, judgeId, error }, 'Judge failed to evaluate');
    }

    await this.stepDelay();
  }

  // Update round status
  await db
    .update(schema.rounds)
    .set({ status: 'scoring' })
    .where(eq(schema.rounds.id, roundId));
}
```

---

## Step 1.10: Scoring Calculation

### Add to GameEngine:

```typescript
/**
 * Calculate final scores for the round
 * Aggregates peer judgments, master breaks ties
 */
private async calculateRoundScores(roundId: string): Promise<Record<string, number>> {
  const [round] = await db
    .select()
    .from(schema.rounds)
    .where(eq(schema.rounds.id, roundId));

  // Get all judgments for this round
  const judgments = await db
    .select()
    .from(schema.modelJudgments)
    .where(eq(schema.modelJudgments.roundId, roundId));

  // Group by target model
  const scoresByModel: Record<string, {
    scores: number[];
    ranks: number[];
    masterScore?: number;
    masterRank?: number;
  }> = {};

  for (const j of judgments) {
    if (!scoresByModel[j.targetModelId]) {
      scoresByModel[j.targetModelId] = { scores: [], ranks: [] };
    }

    if (j.isMasterJudgment) {
      scoresByModel[j.targetModelId].masterScore = j.score;
      scoresByModel[j.targetModelId].masterRank = j.rank;
    } else {
      scoresByModel[j.targetModelId].scores.push(j.score);
      scoresByModel[j.targetModelId].ranks.push(j.rank);
    }
  }

  // Calculate average scores
  const finalScores: Record<string, number> = {};

  for (const [modelId, data] of Object.entries(scoresByModel)) {
    const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    finalScores[modelId] = Math.round(avgScore * 100) / 100;
  }

  // Handle ties using master's ranking
  const sortedModels = Object.entries(finalScores)
    .sort(([, a], [, b]) => b - a);

  // Check for ties and apply master tiebreaker
  for (let i = 0; i < sortedModels.length - 1; i++) {
    const [modelA, scoreA] = sortedModels[i];
    const [modelB, scoreB] = sortedModels[i + 1];

    if (Math.abs(scoreA - scoreB) < 0.5) { // Within 0.5 points = tie
      const masterRankA = scoresByModel[modelA].masterRank ?? 999;
      const masterRankB = scoresByModel[modelB].masterRank ?? 999;

      if (masterRankB < masterRankA) {
        // Master prefers B, boost B's score slightly
        finalScores[modelB] += 0.1;
      }
    }
  }

  // Update round as completed
  await db
    .update(schema.rounds)
    .set({ status: 'completed', completedAt: new Date() })
    .where(eq(schema.rounds.id, roundId));

  this.emit('event', {
    type: 'round_completed',
    roundId,
    scores: finalScores,
  });

  return finalScores;
}
```

---

## Step 1.11: Arena API Endpoints

### Create `app/server/src/api/arena.ts`:

```typescript
// Arena API - Game session management
import { Router } from 'express';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { getGameEngine } from '../services/game-engine.js';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// GET /api/arena/sessions - List sessions
router.get('/sessions', async (req, res) => {
  const sessions = await db
    .select()
    .from(schema.gameSessions)
    .orderBy(desc(schema.gameSessions.createdAt))
    .limit(20);

  res.json({ data: sessions });
});

// POST /api/arena/sessions - Create new session
router.post('/sessions', async (req, res) => {
  const schema = z.object({
    totalRounds: z.number().int().min(1).max(50).optional(),
    modelIds: z.array(z.string().uuid()).optional(),
    stepDelayMs: z.number().int().min(500).max(30000).optional(),
  });

  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Validation failed', details: validation.error.flatten() });
  }

  try {
    const engine = getGameEngine();
    const sessionId = await engine.createSession(validation.data);
    res.status(201).json({ data: { sessionId } });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// POST /api/arena/sessions/:id/start - Start session
router.post('/sessions/:id/start', async (req, res) => {
  const engine = getGameEngine();
  try {
    await engine.startSession(req.params.id);
    res.json({ data: { status: 'started' } });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// POST /api/arena/sessions/:id/pause - Pause session
router.post('/sessions/:id/pause', async (req, res) => {
  const engine = getGameEngine();
  await engine.pauseSession(req.params.id);
  res.json({ data: { status: 'paused' } });
});

// POST /api/arena/trigger - Execute next step (manual mode)
router.post('/trigger', async (req, res) => {
  const engine = getGameEngine();
  // Get current session or create one
  // Execute next step
  // Return step result
});

// GET /api/arena/current - Get current session state
router.get('/current', async (req, res) => {
  // Return current session, round, step info for frontend
});

// GET /api/arena/rounds/:id - Get round details
router.get('/rounds/:id', async (req, res) => {
  // Return round with all steps and judgments
});

export default router;
```

---

## Step 1.12-1.14: Remaining Steps

See inline comments in code above. These involve:
- Creating shared types in `@sabe/shared`
- Building prompt templates for master/judge roles
- Integration testing

---

## Prompt Templates

### Master Topic Selection Prompt:
```
You are the Master of this round. Choose a topic for the question.

Available topics:
{{#each topics}}
- {{name}}: {{description}}
{{/each}}

Respond with the topic name you choose and briefly explain why.
Format: TOPIC: [name]
REASON: [your reasoning]
```

### Master Question Creation Prompt:
```
You are the Master. Create a challenging question about: {{topicName}}

Requirements:
- The question should test {{topicDescription}}
- Difficulty should be {{difficulty}}
- Question should have a clear, evaluable answer
- You will NOT answer this question yourself

Format:
QUESTION: [your question]
DIFFICULTY: [easy/medium/hard/expert]
EVALUATION_HINTS: [what makes a good answer]
```

### Answer Prompt:
```
Answer the following question thoughtfully and completely.

QUESTION: {{question}}

Provide your answer, showing your reasoning process.
```

### Judging Prompt:
```
You are judging the following answers to this question:

QUESTION: {{question}}

ANSWERS:
{{#each answers}}
[Answer {{@index}}]:
{{this.content}}

{{/each}}

For each answer, provide:
1. A score from 0-100
2. A rank (1 = best)
3. Brief reasoning

Format your response as JSON:
{
  "judgments": [
    { "answerId": 0, "score": 85, "rank": 1, "reasoning": "..." },
    ...
  ]
}
```

---

## Files Created/Modified Summary

### New Files
- `app/server/src/services/game-engine.ts`
- `app/server/src/api/arena.ts`
- `app/shared/src/types/game.ts`

### Modified Files
- `app/server/src/db/schema.ts` (add 4 new tables)
- `app/server/src/index.ts` (register arena router)
- `app/shared/src/index.ts` (export game types)

---

## Completion Checklist

Before moving to Phase 2:

- [x] All 4 new database tables created
- [x] GameEngine service fully implemented
- [x] Master selection rotates correctly
- [x] Question generation works
- [x] All models answer in sequence
- [x] All models judge (including master)
- [x] Scoring with tiebreaker works
- [x] Arena API endpoints respond correctly
- [x] Events emitted at each step
- [x] Can run complete session manually (verified with free models)

---

## Implementation Notes (2025-11-29)

### Files Created

1. **`app/server/src/services/game-engine.ts`** (~700 lines)
   - Complete GameEngine class with EventEmitter
   - Session creation, start, pause, complete lifecycle
   - `executeNextStep()` for manual mode
   - `getCurrentState()` for real-time display
   - Full round execution flow

2. **`app/server/src/services/prompt-builder.ts`** (~250 lines)
   - `buildTopicSelectionPrompt()` - Master topic selection
   - `buildQuestionCreationPrompt()` - Master question creation
   - `buildAnswerPrompt()` - Participant answering
   - `buildJudgingPrompt()` - Model judging with criteria
   - JSON response parsers with fallbacks

3. **`app/server/src/api/arena.ts`** (~300 lines)
   - `GET /api/arena/sessions` - List sessions
   - `POST /api/arena/sessions` - Create session
   - `GET /api/arena/sessions/:id` - Session detail with rounds
   - `POST /api/arena/sessions/:id/start` - Start automatic mode
   - `POST /api/arena/sessions/:id/pause` - Pause session
   - `POST /api/arena/trigger` - Manual step execution
   - `GET /api/arena/current` - Current game state
   - `GET /api/arena/rounds/:id` - Round detail
   - `GET /api/arena/rounds/:id/scores` - Round rankings
   - `GET /api/arena/rounds/:roundId/models/:modelId` - Model round detail

4. **`app/shared/src/types/game.ts`** (~200 lines)
   - Status enums: `GameSessionStatus`, `RoundStatus`, `StepType`, `StepStatus`
   - Entity interfaces: `GameSessionInfo`, `RoundInfo`, `StepInfo`, `JudgmentInfo`
   - Current state types: `CurrentArenaState`, `ArenaModel`
   - API response types: `TriggerStepResult`, `SessionStartResult`

### Database Tables Added

1. **`game_sessions`** - Session tracking
2. **`rounds`** - Individual rounds within sessions
3. **`round_steps`** - Atomic steps within rounds
4. **`model_judgments`** - Peer evaluation records

### Files Modified

1. **`app/server/src/db/schema.ts`** - Added 4 new tables + types
2. **`app/server/src/index.ts`** - Registered arena router
3. **`app/shared/src/index.ts`** - Export game types

### Verified Working

Tested complete session flow with 2 free models:
1. Session creation (validates min 2 models)
2. Manual trigger step-by-step execution
3. Master topic selection (Llama selected "logic_puzzles")
4. Master question creation (generated Petra question)
5. Participant answering (Grok answered correctly)
6. Both models judging (Master and participant)
7. Scoring calculation with final rankings
8. Session completion marking

### API Response Example

```bash
# Trigger a step
curl -X POST http://localhost:3000/api/arena/trigger \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "..."}'

# Response
{
  "data": {
    "step": {
      "id": "...",
      "roundId": "...",
      "stepType": "master_topic",
      "status": "completed",
      "outputData": { "selectedTopic": "reasoning", "reasoning": "..." },
      "llmResponseTimeMs": 5786
    },
    "sessionCompleted": false,
    "roundCompleted": false
  }
}
```

---

**Next Phase:** See `PHASE_2_REALTIME.md` for SSE implementation.
