// Arena API - Game session management endpoints
// Provides REST API for creating, starting, and managing AI Arena game sessions
// Includes SSE endpoint for real-time updates

import { Router } from 'express';
import { z } from 'zod';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { getGameEngine } from '../services/game-engine.js';
import { sseMiddleware, type SSEResponse } from '../middleware/sse.js';
import {
  addClient,
  removeClient,
  sendStateSnapshot,
  getClientCount,
} from '../services/event-bridge.js';
import type { ConnectedEvent } from '@sabe/shared';

const router = Router();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createSessionSchema = z.object({
  totalRounds: z.number().int().min(1).max(50).optional(),
  modelIds: z.array(z.string().uuid()).optional(),
  stepDelayMs: z.number().int().min(500).max(30000).optional(),
});

// =============================================================================
// SSE ENDPOINT
// =============================================================================

/**
 * GET /api/arena/events
 * SSE endpoint for real-time game updates
 * Clients connect here to receive live event stream
 */
router.get('/events', sseMiddleware, async (req, res) => {
  const sseRes = res as SSEResponse;

  // Add client to broadcast set
  addClient(sseRes);

  // Send connection acknowledgment
  const connectedEvent: ConnectedEvent = {
    type: 'connected',
    timestamp: new Date().toISOString(),
    message: 'Connected to arena event stream',
  };
  sseRes.sse.send('connected', connectedEvent);

  // Send current state snapshot
  await sendStateSnapshot(sseRes);

  // Remove client on disconnect
  req.on('close', () => {
    removeClient(sseRes);
  });
});

/**
 * GET /api/arena/events/status
 * Get SSE connection status (number of connected clients)
 */
router.get('/events/status', (_req, res) => {
  res.json({
    data: {
      connectedClients: getClientCount(),
      timestamp: new Date().toISOString(),
    },
  });
});

// =============================================================================
// SESSION ENDPOINTS
// =============================================================================

/**
 * GET /api/arena/sessions
 * List all game sessions (most recent first)
 */
router.get('/sessions', async (_req, res, next) => {
  try {
    const sessions = await db
      .select()
      .from(schema.gameSessions)
      .orderBy(desc(schema.gameSessions.createdAt))
      .limit(20);

    res.json({ data: sessions });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/arena/sessions
 * Create a new game session
 */
router.post('/sessions', async (req, res, next) => {
  try {
    const validation = createSessionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.flatten(),
      });
    }

    const engine = getGameEngine();
    const sessionId = await engine.createSession(validation.data);

    // Fetch the created session
    const [session] = await db
      .select()
      .from(schema.gameSessions)
      .where(eq(schema.gameSessions.id, sessionId));

    res.status(201).json({ data: session });
  } catch (error) {
    if ((error as Error).message.includes('at least 2 active models')) {
      return res.status(400).json({ error: (error as Error).message });
    }
    next(error);
  }
});

/**
 * GET /api/arena/sessions/:id
 * Get session details
 */
router.get('/sessions/:id', async (req, res, next) => {
  try {
    const [session] = await db
      .select()
      .from(schema.gameSessions)
      .where(eq(schema.gameSessions.id, req.params.id));

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get rounds for this session
    const rounds = await db
      .select()
      .from(schema.rounds)
      .where(eq(schema.rounds.sessionId, session.id))
      .orderBy(schema.rounds.roundNumber);

    res.json({
      data: {
        ...session,
        rounds,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/arena/sessions/:id/start
 * Start a session (for cron/automatic mode)
 * This runs the complete game loop asynchronously
 */
router.post('/sessions/:id/start', async (req, res, next) => {
  try {
    const engine = getGameEngine();

    // Start async (don't await the full loop)
    engine.startSession(req.params.id).catch(error => {
      console.error('Session start error:', error);
    });

    res.json({ data: { status: 'started', sessionId: req.params.id } });
  } catch (error) {
    if ((error as Error).message.includes('Cannot start session')) {
      return res.status(400).json({ error: (error as Error).message });
    }
    if ((error as Error).message.includes('not found')) {
      return res.status(404).json({ error: (error as Error).message });
    }
    next(error);
  }
});

/**
 * POST /api/arena/sessions/:id/pause
 * Pause a running session
 */
router.post('/sessions/:id/pause', async (req, res, next) => {
  try {
    const engine = getGameEngine();
    await engine.pauseSession(req.params.id);
    res.json({ data: { status: 'paused', sessionId: req.params.id } });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// MANUAL TRIGGER ENDPOINT
// =============================================================================

/**
 * POST /api/arena/trigger
 * Execute the next step (manual mode)
 * Returns the executed step info
 */
router.post('/trigger', async (req, res, next) => {
  try {
    const { sessionId } = req.body as { sessionId?: string };

    const engine = getGameEngine();
    const result = await engine.executeNextStep(sessionId);

    if (!result) {
      return res.status(404).json({
        error: 'No active session found. Create a session first.',
      });
    }

    res.json({ data: result });
  } catch (error) {
    if ((error as Error).message.includes('Cannot execute step')) {
      return res.status(400).json({ error: (error as Error).message });
    }
    next(error);
  }
});

// =============================================================================
// STATE ENDPOINT
// =============================================================================

/**
 * GET /api/arena/current
 * Get current game state (for frontend display)
 */
router.get('/current', async (_req, res, next) => {
  try {
    const engine = getGameEngine();
    const state = await engine.getCurrentState();

    if (!state) {
      return res.json({
        data: {
          session: null,
          currentRound: null,
          currentStep: null,
          models: [],
          recentActivity: [],
        },
      });
    }

    res.json({ data: state });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// ROUND ENDPOINTS
// =============================================================================

/**
 * GET /api/arena/rounds/:id
 * Get round details with all steps and judgments
 */
router.get('/rounds/:id', async (req, res, next) => {
  try {
    const [round] = await db
      .select()
      .from(schema.rounds)
      .where(eq(schema.rounds.id, req.params.id));

    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    // Get master info
    const [master] = await db
      .select()
      .from(schema.models)
      .where(eq(schema.models.id, round.masterId));

    // Get topic info
    const [topic] = round.topicId
      ? await db.select().from(schema.questionTypes).where(eq(schema.questionTypes.id, round.topicId))
      : [null];

    // Get all steps
    const steps = await db
      .select()
      .from(schema.roundSteps)
      .where(eq(schema.roundSteps.roundId, round.id))
      .orderBy(schema.roundSteps.stepNumber);

    // Get all judgments
    const judgments = await db
      .select()
      .from(schema.modelJudgments)
      .where(eq(schema.modelJudgments.roundId, round.id));

    res.json({
      data: {
        ...round,
        masterName: master?.displayName,
        topicName: topic?.name,
        steps,
        judgments,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/arena/rounds/:id/scores
 * Get round scores
 */
router.get('/rounds/:id/scores', async (req, res, next) => {
  try {
    const [round] = await db
      .select()
      .from(schema.rounds)
      .where(eq(schema.rounds.id, req.params.id));

    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    // Get scoring step
    const [scoringStep] = await db
      .select()
      .from(schema.roundSteps)
      .where(
        and(
          eq(schema.roundSteps.roundId, round.id),
          eq(schema.roundSteps.stepType, 'scoring'),
          eq(schema.roundSteps.status, 'completed')
        )
      );

    if (!scoringStep || !scoringStep.outputData) {
      return res.json({ data: { scores: {}, rankings: [] } });
    }

    const scores = (scoringStep.outputData as { scores: Record<string, number> }).scores;

    // Get model names and build rankings
    const modelIds = Object.keys(scores);
    const models = modelIds.length > 0
      ? await db
          .select()
          .from(schema.models)
          .where(inArray(schema.models.id, modelIds))
      : [];

    const modelMap = new Map(models.map(m => [m.id, m.displayName]));

    const rankings = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .map(([modelId, score], index) => ({
        modelId,
        modelName: modelMap.get(modelId) ?? 'Unknown',
        score,
        rank: index + 1,
      }));

    res.json({
      data: {
        roundId: round.id,
        roundNumber: round.roundNumber,
        scores,
        rankings,
      },
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// MODEL DETAIL ENDPOINT
// =============================================================================

/**
 * GET /api/arena/rounds/:roundId/models/:modelId
 * Get model's detail for a specific round (answer, judgments received/given)
 */
router.get('/rounds/:roundId/models/:modelId', async (req, res, next) => {
  try {
    const { roundId, modelId } = req.params;

    const [round] = await db
      .select()
      .from(schema.rounds)
      .where(eq(schema.rounds.id, roundId));

    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    const [model] = await db
      .select()
      .from(schema.models)
      .where(eq(schema.models.id, modelId));

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Get model's answer
    const [answerStep] = await db
      .select()
      .from(schema.roundSteps)
      .where(
        and(
          eq(schema.roundSteps.roundId, roundId),
          eq(schema.roundSteps.stepType, 'model_answer'),
          eq(schema.roundSteps.actorModelId, modelId)
        )
      );

    // Get judgments received
    const judgmentsReceived = await db
      .select()
      .from(schema.modelJudgments)
      .where(
        and(
          eq(schema.modelJudgments.roundId, roundId),
          eq(schema.modelJudgments.targetModelId, modelId)
        )
      );

    // Get judgments given
    const judgmentsGiven = await db
      .select()
      .from(schema.modelJudgments)
      .where(
        and(
          eq(schema.modelJudgments.roundId, roundId),
          eq(schema.modelJudgments.judgeModelId, modelId)
        )
      );

    // Get judge and target names
    const allModelIds = new Set([
      ...judgmentsReceived.map(j => j.judgeModelId),
      ...judgmentsGiven.map(j => j.targetModelId),
    ]);

    const relatedModels = allModelIds.size > 0
      ? await db
          .select()
          .from(schema.models)
          .where(inArray(schema.models.id, Array.from(allModelIds)))
      : [];

    const modelNameMap = new Map(relatedModels.map(m => [m.id, m.displayName]));

    // Calculate final score if round completed
    let finalScore = null;
    let finalRank = null;

    const [scoringStep] = await db
      .select()
      .from(schema.roundSteps)
      .where(
        and(
          eq(schema.roundSteps.roundId, roundId),
          eq(schema.roundSteps.stepType, 'scoring'),
          eq(schema.roundSteps.status, 'completed')
        )
      );

    if (scoringStep?.outputData) {
      const scores = (scoringStep.outputData as { scores: Record<string, number> }).scores;
      finalScore = scores[modelId] ?? null;

      if (finalScore !== null) {
        const sortedScores = Object.entries(scores).sort(([, a], [, b]) => b - a);
        finalRank = sortedScores.findIndex(([id]) => id === modelId) + 1;
      }
    }

    res.json({
      data: {
        model: {
          id: model.id,
          displayName: model.displayName,
        },
        isMaster: round.masterId === modelId,
        answer: answerStep?.outputData
          ? (answerStep.outputData as { answer: string }).answer
          : null,
        responseTimeMs: answerStep?.llmResponseTimeMs ?? null,
        judgmentsReceived: judgmentsReceived.map(j => ({
          ...j,
          judgeName: modelNameMap.get(j.judgeModelId),
        })),
        judgmentsGiven: judgmentsGiven.map(j => ({
          ...j,
          targetName: modelNameMap.get(j.targetModelId),
        })),
        finalScore,
        finalRank,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
