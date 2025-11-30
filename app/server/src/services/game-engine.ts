// Game Engine Service - Orchestrates AI Arena game flow
// Manages sessions, rounds, and step-by-step execution

import { v4 as uuid } from 'uuid';
import pino from 'pino';
import { EventEmitter } from 'events';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { db, schema, type Model, type QuestionType } from '../db/index.js';
import { getProviderManager } from './llm/index.js';
import {
  buildTopicSelectionPrompt,
  buildQuestionCreationPrompt,
  buildAnswerPrompt,
  buildJudgingPrompt,
  parseTopicSelection,
  parseQuestionCreation,
  parseJudgments,
  getAnswerLetter,
} from './prompt-builder.js';
import type {
  GameSessionStatus,
  RoundStatus,
  StepType,
  StepStatus,
  CreateSessionOptions,
  CurrentArenaState,
  ArenaModel,
  StepInfo,
  TriggerStepResult,
} from '@sabe/shared';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

// =============================================================================
// EVENT TYPES
// =============================================================================

export interface GameEvent {
  type: string;
  timestamp: string;
  sessionId?: string;
  roundId?: string;
  stepId?: string;
  data?: Record<string, unknown>;
}

// =============================================================================
// GAME ENGINE CLASS
// =============================================================================

export class GameEngine extends EventEmitter {
  private activeSessionId: string | null = null;
  private isPaused = false;
  private stepDelayMs = 2000;

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  /**
   * Create a new game session
   */
  async createSession(options: CreateSessionOptions = {}): Promise<string> {
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

    const totalRounds = options.totalRounds ?? 5;
    this.stepDelayMs = options.stepDelayMs ?? 2000;

    await db.insert(schema.gameSessions).values({
      id: sessionId,
      status: 'created',
      totalRounds,
      completedRounds: 0,
      participatingModelIds: participatingModels.map(m => m.id),
      config: {
        stepDelayMs: this.stepDelayMs,
      },
      createdAt: now,
    });

    logger.info({
      sessionId,
      totalRounds,
      modelCount: participatingModels.length,
    }, 'Game session created');

    this.emitEvent('session_created', { sessionId, totalRounds, modelCount: participatingModels.length });

    return sessionId;
  }

  /**
   * Start a game session (for cron/automatic mode)
   */
  async startSession(sessionId: string): Promise<void> {
    const [session] = await db
      .select()
      .from(schema.gameSessions)
      .where(eq(schema.gameSessions.id, sessionId));

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'created' && session.status !== 'paused') {
      throw new Error(`Cannot start session in status: ${session.status}`);
    }

    if (this.activeSessionId && this.activeSessionId !== sessionId) {
      throw new Error('Another session is already running');
    }

    this.activeSessionId = sessionId;
    this.isPaused = false;
    this.stepDelayMs = session.config?.stepDelayMs ?? 2000;

    await db
      .update(schema.gameSessions)
      .set({ status: 'running', startedAt: session.startedAt ?? new Date() })
      .where(eq(schema.gameSessions.id, sessionId));

    this.emitEvent('session_started', { sessionId });
    logger.info({ sessionId }, 'Game session started');

    // Run the game loop
    try {
      await this.runGameLoop(sessionId);
    } catch (error) {
      logger.error({ sessionId, error }, 'Game loop failed');
      await this.failSession(sessionId, (error as Error).message);
    }
  }

  /**
   * Execute the next step manually (for manual mode)
   */
  async executeNextStep(sessionId?: string): Promise<TriggerStepResult | null> {
    // Get or create session
    let session;
    if (sessionId) {
      [session] = await db
        .select()
        .from(schema.gameSessions)
        .where(eq(schema.gameSessions.id, sessionId));
    } else {
      // Get most recent session that's either created or running
      [session] = await db
        .select()
        .from(schema.gameSessions)
        .where(inArray(schema.gameSessions.status, ['created', 'running', 'paused']))
        .orderBy(desc(schema.gameSessions.createdAt))
        .limit(1);
    }

    if (!session) {
      return null;
    }

    // Ensure session is in valid state
    if (session.status === 'created') {
      await db
        .update(schema.gameSessions)
        .set({ status: 'running', startedAt: new Date() })
        .where(eq(schema.gameSessions.id, session.id));
      session.status = 'running';
    }

    if (session.status !== 'running' && session.status !== 'paused') {
      throw new Error(`Cannot execute step in session status: ${session.status}`);
    }

    this.activeSessionId = session.id;
    this.stepDelayMs = session.config?.stepDelayMs ?? 2000;

    // Get current round or create new one
    let round = session.currentRoundId
      ? await this.getRound(session.currentRoundId)
      : null;

    // Need to start a new round?
    if (!round || round.status === 'completed') {
      if (session.completedRounds >= session.totalRounds) {
        // Session complete
        await this.completeSession(session.id);
        return {
          step: {
            id: '',
            roundId: '',
            stepNumber: 0,
            stepType: 'scoring',
            status: 'completed',
            actorModelId: null,
            targetModelId: null,
            outputData: null,
            llmResponseTimeMs: null,
            errorMessage: null,
            startedAt: null,
            completedAt: null,
          },
          sessionCompleted: true,
          roundCompleted: true,
        };
      }
      round = await this.startRound(session.id, session.completedRounds + 1, session.participatingModelIds);
    }

    // Execute the next step in this round
    const stepResult = await this.executeRoundStep(round.id, session.participatingModelIds);

    // Check if round completed
    const updatedRound = await this.getRound(round.id);
    const roundCompleted = updatedRound?.status === 'completed';

    if (roundCompleted) {
      // Update session
      await db
        .update(schema.gameSessions)
        .set({
          completedRounds: session.completedRounds + 1,
          currentRoundId: null,
        })
        .where(eq(schema.gameSessions.id, session.id));

      // Check if session completed
      if (session.completedRounds + 1 >= session.totalRounds) {
        await this.completeSession(session.id);
        return {
          step: stepResult,
          sessionCompleted: true,
          roundCompleted: true,
        };
      }
    }

    return {
      step: stepResult,
      sessionCompleted: false,
      roundCompleted,
    };
  }

  /**
   * Pause a running session
   */
  async pauseSession(sessionId: string): Promise<void> {
    this.isPaused = true;
    await db
      .update(schema.gameSessions)
      .set({ status: 'paused' })
      .where(eq(schema.gameSessions.id, sessionId));

    this.emitEvent('session_paused', { sessionId });
    logger.info({ sessionId }, 'Game session paused');
  }

  /**
   * Force-end a session (mark as completed regardless of progress)
   * Used when restarting a new game
   */
  async endSession(sessionId: string): Promise<void> {
    const [session] = await db
      .select()
      .from(schema.gameSessions)
      .where(eq(schema.gameSessions.id, sessionId));

    if (!session) {
      throw new Error('Session not found');
    }

    // Stop if this is the active session
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
      this.isPaused = true;
    }

    // Mark session as completed
    await db
      .update(schema.gameSessions)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(schema.gameSessions.id, sessionId));

    // Also mark current round as completed if there is one
    if (session.currentRoundId) {
      await db
        .update(schema.rounds)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(schema.rounds.id, session.currentRoundId));
    }

    this.emitEvent('session_ended', { sessionId });
    logger.info({ sessionId }, 'Game session force-ended');
  }

  /**
   * Step back - completely erase the last step as if it never happened.
   * This fully reverts DB state, round fields, and emits an event for UI sync.
   */
  async undoLastStep(sessionId?: string): Promise<{
    deletedStep: StepInfo | null;
    newRoundStatus: RoundStatus | null;
    clearedFields: { topicId?: boolean; questionContent?: boolean };
  }> {
    // Get session
    let session;
    if (sessionId) {
      [session] = await db
        .select()
        .from(schema.gameSessions)
        .where(eq(schema.gameSessions.id, sessionId));
    } else {
      [session] = await db
        .select()
        .from(schema.gameSessions)
        .where(inArray(schema.gameSessions.status, ['created', 'running', 'paused']))
        .orderBy(desc(schema.gameSessions.createdAt))
        .limit(1);
    }

    if (!session) {
      throw new Error('No active session found');
    }

    if (!session.currentRoundId) {
      throw new Error('No active round to undo step in');
    }

    // Get the last step in current round (any status - completed, failed, running)
    const [lastStep] = await db
      .select()
      .from(schema.roundSteps)
      .where(eq(schema.roundSteps.roundId, session.currentRoundId))
      .orderBy(desc(schema.roundSteps.stepNumber))
      .limit(1);

    if (!lastStep) {
      throw new Error('No steps to undo');
    }

    // Track which round fields need to be cleared
    const clearedFields: { topicId?: boolean; questionContent?: boolean } = {};

    // Delete associated judgments if this was a judge step
    if (lastStep.stepType === 'model_judge' && lastStep.actorModelId) {
      await db
        .delete(schema.modelJudgments)
        .where(
          and(
            eq(schema.modelJudgments.roundId, session.currentRoundId),
            eq(schema.modelJudgments.judgeModelId, lastStep.actorModelId)
          )
        );
    }

    // Delete the step
    await db
      .delete(schema.roundSteps)
      .where(eq(schema.roundSteps.id, lastStep.id));

    // Determine new round status and what fields to clear
    const { newStatus, roundUpdates } = await this.calculateUndoState(
      session.currentRoundId,
      session.id,
      lastStep.stepType
    );

    // Apply round updates
    await db
      .update(schema.rounds)
      .set({ status: newStatus, ...roundUpdates })
      .where(eq(schema.rounds.id, session.currentRoundId));

    // Track cleared fields for the event
    if (roundUpdates.topicId === null) clearedFields.topicId = true;
    if (roundUpdates.questionContent === null) clearedFields.questionContent = true;

    logger.info({
      sessionId: session.id,
      roundId: session.currentRoundId,
      deletedStepId: lastStep.id,
      deletedStepType: lastStep.stepType,
      deletedActorId: lastStep.actorModelId,
      newStatus,
      clearedFields,
    }, 'Step undone (erased)');

    // Emit event for SSE broadcast
    this.emitEvent('step_undone', {
      sessionId: session.id,
      roundId: session.currentRoundId,
      deletedStepType: lastStep.stepType,
      deletedActorId: lastStep.actorModelId,
      newRoundStatus: newStatus,
      clearedFields,
    });

    return {
      deletedStep: this.mapStepToInfo(lastStep),
      newRoundStatus: newStatus,
      clearedFields,
    };
  }

  /**
   * Calculate the new round state after undoing a step.
   * Returns the new status and any round fields that need to be cleared.
   */
  private async calculateUndoState(
    roundId: string,
    sessionId: string,
    deletedStepType: StepType
  ): Promise<{
    newStatus: RoundStatus;
    roundUpdates: Partial<{
      topicId: string | null;
      questionContent: string | null;
      questionDifficulty: 'easy' | 'medium' | 'hard' | 'expert' | null;
    }>;
  }> {
    // Get remaining completed steps after deletion
    const remainingSteps = await db
      .select()
      .from(schema.roundSteps)
      .where(
        and(
          eq(schema.roundSteps.roundId, roundId),
          eq(schema.roundSteps.status, 'completed')
        )
      )
      .orderBy(desc(schema.roundSteps.stepNumber));

    const roundUpdates: Partial<{
      topicId: string | null;
      questionContent: string | null;
      questionDifficulty: 'easy' | 'medium' | 'hard' | 'expert' | null;
    }> = {};

    // If no completed steps remain, reset to 'created'
    if (remainingSteps.length === 0) {
      // Clear all round data fields based on what step we deleted
      if (deletedStepType === 'master_topic') {
        roundUpdates.topicId = null;
      }
      if (deletedStepType === 'master_question' || deletedStepType === 'master_topic') {
        roundUpdates.questionContent = null;
        roundUpdates.questionDifficulty = null;
      }
      return { newStatus: 'created', roundUpdates };
    }

    // Find the last remaining completed step
    const lastCompletedStep = remainingSteps[0];

    // Determine what fields to clear based on what was deleted
    if (deletedStepType === 'master_question') {
      // Reverting question creation - clear question but keep topic
      roundUpdates.questionContent = null;
      roundUpdates.questionDifficulty = null;
    } else if (deletedStepType === 'master_topic') {
      // Reverting topic selection - clear everything
      roundUpdates.topicId = null;
      roundUpdates.questionContent = null;
      roundUpdates.questionDifficulty = null;
    }

    // Calculate new status based on remaining steps
    switch (lastCompletedStep.stepType) {
      case 'master_topic':
        return { newStatus: 'topic_selection', roundUpdates };

      case 'master_question':
        return { newStatus: 'question_creation', roundUpdates };

      case 'model_answer': {
        // Check if all non-master models have answered
        const [session] = await db
          .select()
          .from(schema.gameSessions)
          .where(eq(schema.gameSessions.id, sessionId));

        const respondingCount = session.participatingModelIds.length - 1;
        const answerCount = remainingSteps.filter(s => s.stepType === 'model_answer').length;

        return {
          newStatus: answerCount >= respondingCount ? 'judging' : 'answering',
          roundUpdates,
        };
      }

      case 'model_judge':
        return { newStatus: 'judging', roundUpdates };

      case 'scoring':
        return { newStatus: 'completed', roundUpdates };

      default:
        return { newStatus: 'created', roundUpdates };
    }
  }

  /**
   * Get current game state for display
   */
  async getCurrentState(): Promise<CurrentArenaState | null> {
    // Get active or most recent session
    const [session] = await db
      .select()
      .from(schema.gameSessions)
      .orderBy(desc(schema.gameSessions.createdAt))
      .limit(1);

    if (!session) {
      return null;
    }

    // Get current round
    let currentRound = null;
    if (session.currentRoundId) {
      currentRound = await this.getRoundInfo(session.currentRoundId);
    }

    // Get current step
    let currentStep = null;
    if (session.currentRoundId) {
      const [step] = await db
        .select()
        .from(schema.roundSteps)
        .where(
          and(
            eq(schema.roundSteps.roundId, session.currentRoundId),
            eq(schema.roundSteps.status, 'running')
          )
        )
        .limit(1);

      if (step) {
        currentStep = this.mapStepToInfo(step);
      }
    }

    // Get models with their arena status
    const models = await this.getArenaModels(session.participatingModelIds, session.currentRoundId);

    return {
      session: {
        id: session.id,
        status: session.status as GameSessionStatus,
        totalRounds: session.totalRounds,
        completedRounds: session.completedRounds,
        currentRoundId: session.currentRoundId,
        participatingModelIds: session.participatingModelIds,
        config: session.config,
        startedAt: session.startedAt?.toISOString() ?? null,
        completedAt: session.completedAt?.toISOString() ?? null,
        createdAt: session.createdAt.toISOString(),
      },
      currentRound,
      currentStep,
      models,
      recentActivity: [],
    };
  }

  // ==========================================================================
  // PRIVATE: GAME LOOP
  // ==========================================================================

  /**
   * Run the complete game loop (for automatic mode)
   */
  private async runGameLoop(sessionId: string): Promise<void> {
    const [session] = await db
      .select()
      .from(schema.gameSessions)
      .where(eq(schema.gameSessions.id, sessionId));

    if (!session) return;

    const { totalRounds, participatingModelIds } = session;
    let completedRounds = session.completedRounds;

    while (completedRounds < totalRounds && !this.isPaused) {
      const roundNumber = completedRounds + 1;

      // Start new round
      const round = await this.startRound(sessionId, roundNumber, participatingModelIds);

      // Execute all steps in round
      while (!this.isPaused) {
        const updatedRound = await this.getRound(round.id);
        if (!updatedRound || updatedRound.status === 'completed' || updatedRound.status === 'failed') {
          break;
        }

        await this.executeRoundStep(round.id, participatingModelIds);
        await this.delay(this.stepDelayMs);
      }

      if (this.isPaused) break;

      completedRounds++;
      await db
        .update(schema.gameSessions)
        .set({ completedRounds, currentRoundId: null })
        .where(eq(schema.gameSessions.id, sessionId));
    }

    if (!this.isPaused) {
      await this.completeSession(sessionId);
    }
  }

  // ==========================================================================
  // PRIVATE: ROUND MANAGEMENT
  // ==========================================================================

  /**
   * Start a new round
   */
  private async startRound(
    sessionId: string,
    roundNumber: number,
    modelIds: string[]
  ): Promise<schema.Round> {
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

    const [round] = await db
      .select()
      .from(schema.rounds)
      .where(eq(schema.rounds.id, roundId));

    // Get master name for logging
    const [master] = await db
      .select()
      .from(schema.models)
      .where(eq(schema.models.id, masterId));

    this.emitEvent('round_started', {
      sessionId,
      roundId,
      roundNumber,
      masterId,
      masterName: master?.displayName,
    });

    logger.info({ roundId, roundNumber, masterId }, 'Round started');

    return round;
  }

  /**
   * Select master for a round (rotating through models)
   */
  private selectMaster(modelIds: string[], roundNumber: number): string {
    const index = (roundNumber - 1) % modelIds.length;
    return modelIds[index];
  }

  /**
   * Execute the next step in a round
   * First checks for any failed/running steps and cleans them up for retry
   */
  private async executeRoundStep(
    roundId: string,
    modelIds: string[]
  ): Promise<StepInfo> {
    const round = await this.getRound(roundId);
    if (!round) {
      throw new Error('Round not found');
    }

    // Check for any failed or stuck running steps - clean them up for retry
    await this.cleanupIncompleteSteps(roundId);

    // Determine which step to execute based on round status
    switch (round.status) {
      case 'created':
        return this.executeMasterTopicStep(round);

      case 'topic_selection':
        return this.executeMasterQuestionStep(round);

      case 'question_creation':
        return this.executeAnsweringStep(round, modelIds);

      case 'answering':
        // Check if all answers are complete
        const answersComplete = await this.areAllAnswersComplete(roundId, modelIds, round.masterId);
        if (answersComplete) {
          await this.updateRoundStatus(roundId, 'judging');
          return this.executeJudgingStep(round, modelIds);
        }
        return this.executeAnsweringStep(round, modelIds);

      case 'judging':
        // Check if all judgments are complete
        const judgmentsComplete = await this.areAllJudgmentsComplete(roundId, modelIds);
        if (judgmentsComplete) {
          return this.executeScoringStep(round);
        }
        return this.executeJudgingStep(round, modelIds);

      case 'scoring':
        // Round should be complete after scoring
        return this.executeScoringStep(round);

      default:
        throw new Error(`Unexpected round status: ${round.status}`);
    }
  }

  // ==========================================================================
  // PRIVATE: STEP EXECUTION
  // ==========================================================================

  /**
   * Execute master topic selection step
   */
  private async executeMasterTopicStep(round: schema.Round): Promise<StepInfo> {
    const stepId = uuid();
    const now = new Date();

    // Create step record
    await db.insert(schema.roundSteps).values({
      id: stepId,
      roundId: round.id,
      stepNumber: 1,
      stepType: 'master_topic',
      status: 'running',
      actorModelId: round.masterId,
      startedAt: now,
      createdAt: now,
    });

    this.emitEvent('step_started', {
      stepId,
      roundId: round.id,
      stepType: 'master_topic',
      actorId: round.masterId,
    });

    try {
      const providerManager = await getProviderManager();

      // Get master model
      const [master] = await db
        .select()
        .from(schema.models)
        .where(eq(schema.models.id, round.masterId));

      // Get available topics
      const topics = await db.select().from(schema.questionTypes);

      if (topics.length === 0) {
        throw new Error('No question types available');
      }

      const prompt = buildTopicSelectionPrompt({
        topics: topics.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
        })),
      });

      const startTime = Date.now();
      const response = await this.executeWithRetry(() =>
        providerManager.sendPrompt(
          master.providerId,
          master.providerModelId,
          prompt,
          { temperature: 0.7, maxTokens: 300 }
        )
      );
      const responseTimeMs = Date.now() - startTime;

      // Parse response
      const { selectedTopic, reasoning, topicId } = parseTopicSelection(
        response.content,
        topics.map(t => ({ id: t.id, name: t.name }))
      );

      // Update step
      await db
        .update(schema.roundSteps)
        .set({
          status: 'completed',
          outputData: { selectedTopic, reasoning, topicId },
          llmResponseTimeMs: responseTimeMs,
          llmTokensUsed: response.tokensInput + response.tokensOutput,
          completedAt: new Date(),
        })
        .where(eq(schema.roundSteps.id, stepId));

      // Update round
      await db
        .update(schema.rounds)
        .set({
          status: 'topic_selection',
          topicId,
          startedAt: round.startedAt ?? now,
        })
        .where(eq(schema.rounds.id, round.id));

      const step = await this.getStep(stepId);
      this.emitEvent('step_completed', {
        stepId,
        roundId: round.id,
        stepType: 'master_topic',
        output: { selectedTopic, reasoning },
      });

      logger.info({ roundId: round.id, selectedTopic }, 'Master selected topic');

      return this.mapStepToInfo(step!);
    } catch (error) {
      await this.failStep(stepId, (error as Error).message, {
        roundId: round.id,
        stepType: 'master_topic',
        actorModelId: round.masterId,
      });
      throw error;
    }
  }

  /**
   * Execute master question creation step
   */
  private async executeMasterQuestionStep(round: schema.Round): Promise<StepInfo> {
    const stepId = uuid();
    const now = new Date();

    await db.insert(schema.roundSteps).values({
      id: stepId,
      roundId: round.id,
      stepNumber: 2,
      stepType: 'master_question',
      status: 'running',
      actorModelId: round.masterId,
      startedAt: now,
      createdAt: now,
    });

    this.emitEvent('step_started', {
      stepId,
      roundId: round.id,
      stepType: 'master_question',
      actorId: round.masterId,
    });

    try {
      const providerManager = await getProviderManager();

      const [master] = await db
        .select()
        .from(schema.models)
        .where(eq(schema.models.id, round.masterId));

      // Get topic info
      const [topic] = round.topicId
        ? await db.select().from(schema.questionTypes).where(eq(schema.questionTypes.id, round.topicId))
        : [null];

      // Get participant count
      const [session] = await db
        .select()
        .from(schema.gameSessions)
        .where(eq(schema.gameSessions.id, round.sessionId));

      const prompt = buildQuestionCreationPrompt({
        topicName: topic?.name ?? 'General Knowledge',
        topicDescription: topic?.description ?? null,
        participantCount: (session?.participatingModelIds.length ?? 2) - 1,
      });

      const startTime = Date.now();
      const response = await this.executeWithRetry(() =>
        providerManager.sendPrompt(
          master.providerId,
          master.providerModelId,
          prompt,
          { temperature: 0.8, maxTokens: 500 }
        )
      );
      const responseTimeMs = Date.now() - startTime;

      const { question, difficulty, evaluationHints } = parseQuestionCreation(response.content);

      await db
        .update(schema.roundSteps)
        .set({
          status: 'completed',
          outputData: { question, difficulty, evaluationHints },
          llmResponseTimeMs: responseTimeMs,
          llmTokensUsed: response.tokensInput + response.tokensOutput,
          completedAt: new Date(),
        })
        .where(eq(schema.roundSteps.id, stepId));

      await db
        .update(schema.rounds)
        .set({
          status: 'question_creation',
          questionContent: question,
          questionDifficulty: difficulty,
        })
        .where(eq(schema.rounds.id, round.id));

      const step = await this.getStep(stepId);
      this.emitEvent('step_completed', {
        stepId,
        roundId: round.id,
        stepType: 'master_question',
        output: { question, difficulty },
      });

      logger.info({ roundId: round.id, difficulty }, 'Master created question');

      return this.mapStepToInfo(step!);
    } catch (error) {
      await this.failStep(stepId, (error as Error).message, {
        roundId: round.id,
        stepType: 'master_question',
        actorModelId: round.masterId,
      });
      throw error;
    }
  }

  /**
   * Execute answering step (one model at a time)
   * Order: Start from the model immediately after the master (clockwise)
   */
  private async executeAnsweringStep(
    round: schema.Round,
    modelIds: string[]
  ): Promise<StepInfo> {
    // Find next model that hasn't answered
    // Order should start from the model AFTER the master in clockwise order
    const masterIndex = modelIds.indexOf(round.masterId);
    const respondingModels = this.getClockwiseOrder(modelIds, masterIndex)
      .filter(id => id !== round.masterId);

    const existingAnswers = await db
      .select()
      .from(schema.roundSteps)
      .where(
        and(
          eq(schema.roundSteps.roundId, round.id),
          eq(schema.roundSteps.stepType, 'model_answer')
        )
      );

    const answeredModelIds = new Set(existingAnswers.map(a => a.actorModelId));
    const nextModelId = respondingModels.find(id => !answeredModelIds.has(id));

    if (!nextModelId) {
      // All models have answered, move to judging
      await this.updateRoundStatus(round.id, 'judging');
      return this.executeJudgingStep(round, modelIds);
    }

    const stepId = uuid();
    const stepNumber = existingAnswers.length + 3; // After topic (1) and question (2)
    const now = new Date();

    await db.insert(schema.roundSteps).values({
      id: stepId,
      roundId: round.id,
      stepNumber,
      stepType: 'model_answer',
      status: 'running',
      actorModelId: nextModelId,
      startedAt: now,
      createdAt: now,
    });

    this.emitEvent('step_started', {
      stepId,
      roundId: round.id,
      stepType: 'model_answer',
      actorId: nextModelId,
    });

    try {
      const providerManager = await getProviderManager();

      const [model] = await db
        .select()
        .from(schema.models)
        .where(eq(schema.models.id, nextModelId));

      // Get topic name
      const [topic] = round.topicId
        ? await db.select().from(schema.questionTypes).where(eq(schema.questionTypes.id, round.topicId))
        : [null];

      const prompt = buildAnswerPrompt({
        question: round.questionContent!,
        topicName: topic?.name,
        difficulty: round.questionDifficulty ?? undefined,
      });

      const startTime = Date.now();
      const response = await this.executeWithRetry(() =>
        providerManager.sendPrompt(
          model.providerId,
          model.providerModelId,
          prompt,
          { temperature: 0.7, maxTokens: 1000 }
        )
      );
      const responseTimeMs = Date.now() - startTime;

      await db
        .update(schema.roundSteps)
        .set({
          status: 'completed',
          outputData: { answer: response.content },
          llmResponseTimeMs: responseTimeMs,
          llmTokensUsed: response.tokensInput + response.tokensOutput,
          completedAt: new Date(),
        })
        .where(eq(schema.roundSteps.id, stepId));

      // Update round status if this was the first answer
      if (round.status === 'question_creation') {
        await this.updateRoundStatus(round.id, 'answering');
      }

      const step = await this.getStep(stepId);
      this.emitEvent('step_completed', {
        stepId,
        roundId: round.id,
        stepType: 'model_answer',
        actorId: nextModelId,
        output: { answerPreview: response.content.slice(0, 100) },
      });

      logger.info({ roundId: round.id, modelId: nextModelId }, 'Model answered');

      return this.mapStepToInfo(step!);
    } catch (error) {
      await this.failStep(stepId, (error as Error).message, {
        roundId: round.id,
        stepType: 'model_answer',
        actorModelId: nextModelId,
      });
      throw error;
    }
  }

  /**
   * Execute judging step (one judge at a time)
   * Order: First answerer → other responders in answer order → Master LAST
   * This ensures the master can break ties with authoritative ranking
   */
  private async executeJudgingStep(
    round: schema.Round,
    modelIds: string[]
  ): Promise<StepInfo> {
    const existingJudgments = await db
      .select()
      .from(schema.roundSteps)
      .where(
        and(
          eq(schema.roundSteps.roundId, round.id),
          eq(schema.roundSteps.stepType, 'model_judge')
        )
      );

    const judgedModelIds = new Set(existingJudgments.map(j => j.actorModelId));

    // Get answer steps ordered by stepNumber to determine judging order
    const answerSteps = await db
      .select()
      .from(schema.roundSteps)
      .where(
        and(
          eq(schema.roundSteps.roundId, round.id),
          eq(schema.roundSteps.stepType, 'model_answer'),
          eq(schema.roundSteps.status, 'completed')
        )
      )
      .orderBy(schema.roundSteps.stepNumber);

    // Build judging order: answerers in answer order, then master LAST
    const answererIds = answerSteps.map(s => s.actorModelId!);
    const judgingOrder = [...answererIds, round.masterId];

    // Find next judge who hasn't judged yet
    const nextJudgeId = judgingOrder.find(id => !judgedModelIds.has(id));

    if (!nextJudgeId) {
      // All models have judged, move to scoring
      return this.executeScoringStep(round);
    }

    const stepId = uuid();

    const stepNumber = 3 + answerSteps.length + existingJudgments.length;
    const now = new Date();

    await db.insert(schema.roundSteps).values({
      id: stepId,
      roundId: round.id,
      stepNumber,
      stepType: 'model_judge',
      status: 'running',
      actorModelId: nextJudgeId,
      startedAt: now,
      createdAt: now,
    });

    this.emitEvent('step_started', {
      stepId,
      roundId: round.id,
      stepType: 'model_judge',
      actorId: nextJudgeId,
    });

    try {
      const providerManager = await getProviderManager();

      const [judge] = await db
        .select()
        .from(schema.models)
        .where(eq(schema.models.id, nextJudgeId));

      // Get answers to judge (exclude judge's own answer)
      const answersToJudge = answerSteps
        .filter(a => a.actorModelId !== nextJudgeId)
        .map((a, i) => ({
          letter: getAnswerLetter(i),
          content: (a.outputData as { answer: string })?.answer ?? '',
          modelId: a.actorModelId!,
        }));

      const prompt = buildJudgingPrompt({
        question: round.questionContent!,
        answers: answersToJudge,
        isMaster: nextJudgeId === round.masterId,
      });

      const startTime = Date.now();
      const response = await this.executeWithRetry(() =>
        providerManager.sendPrompt(
          judge.providerId,
          judge.providerModelId,
          prompt,
          { temperature: 0.3, maxTokens: 1500 }
        )
      );
      const responseTimeMs = Date.now() - startTime;

      // Parse judgments
      const { judgments } = parseJudgments(
        response.content,
        answersToJudge.map(a => a.letter)
      );

      // Store judgments
      for (const j of judgments) {
        const targetAnswer = answersToJudge.find(a => a.letter === j.answerId);
        if (!targetAnswer) continue;

        await db.insert(schema.modelJudgments).values({
          id: uuid(),
          roundId: round.id,
          stepId,
          judgeModelId: nextJudgeId,
          targetModelId: targetAnswer.modelId,
          score: j.score,
          rank: j.rank,
          reasoning: j.reasoning,
          criteriaScores: j.criteriaScores,
          isMasterJudgment: nextJudgeId === round.masterId,
          createdAt: now,
        });
      }

      await db
        .update(schema.roundSteps)
        .set({
          status: 'completed',
          outputData: { judgments },
          llmResponseTimeMs: responseTimeMs,
          llmTokensUsed: response.tokensInput + response.tokensOutput,
          completedAt: new Date(),
        })
        .where(eq(schema.roundSteps.id, stepId));

      const step = await this.getStep(stepId);
      this.emitEvent('step_completed', {
        stepId,
        roundId: round.id,
        stepType: 'model_judge',
        actorId: nextJudgeId,
        output: { judgmentCount: judgments.length },
      });

      logger.info({ roundId: round.id, judgeId: nextJudgeId }, 'Model judged');

      return this.mapStepToInfo(step!);
    } catch (error) {
      await this.failStep(stepId, (error as Error).message, {
        roundId: round.id,
        stepType: 'model_judge',
        actorModelId: nextJudgeId,
      });
      throw error;
    }
  }

  /**
   * Execute scoring step (aggregate judgments, handle ties)
   */
  private async executeScoringStep(round: schema.Round): Promise<StepInfo> {
    const stepId = uuid();
    const now = new Date();

    // Count existing steps
    const existingSteps = await db
      .select()
      .from(schema.roundSteps)
      .where(eq(schema.roundSteps.roundId, round.id));

    await db.insert(schema.roundSteps).values({
      id: stepId,
      roundId: round.id,
      stepNumber: existingSteps.length + 1,
      stepType: 'scoring',
      status: 'running',
      startedAt: now,
      createdAt: now,
    });

    this.emitEvent('step_started', {
      stepId,
      roundId: round.id,
      stepType: 'scoring',
    });

    try {
      const finalScores = await this.calculateRoundScores(round.id, round.masterId);

      await db
        .update(schema.roundSteps)
        .set({
          status: 'completed',
          outputData: { scores: finalScores },
          completedAt: new Date(),
        })
        .where(eq(schema.roundSteps.id, stepId));

      await db
        .update(schema.rounds)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(schema.rounds.id, round.id));

      const step = await this.getStep(stepId);
      this.emitEvent('step_completed', {
        stepId,
        roundId: round.id,
        stepType: 'scoring',
        output: { scores: finalScores },
      });

      this.emitEvent('round_completed', {
        roundId: round.id,
        roundNumber: round.roundNumber,
        scores: finalScores,
      });

      logger.info({ roundId: round.id, scores: finalScores }, 'Round completed');

      return this.mapStepToInfo(step!);
    } catch (error) {
      await this.failStep(stepId, (error as Error).message, {
        roundId: round.id,
        stepType: 'scoring',
        actorModelId: null,
      });
      throw error;
    }
  }

  /**
   * Calculate final scores for a round
   */
  private async calculateRoundScores(
    roundId: string,
    masterId: string
  ): Promise<Record<string, number>> {
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
      if (data.scores.length === 0) {
        finalScores[modelId] = data.masterScore ?? 50;
      } else {
        const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
        finalScores[modelId] = Math.round(avgScore * 100) / 100;
      }
    }

    // Handle ties using master's ranking
    const sortedModels = Object.entries(finalScores)
      .sort(([, a], [, b]) => b - a);

    for (let i = 0; i < sortedModels.length - 1; i++) {
      const [modelA, scoreA] = sortedModels[i];
      const [modelB, scoreB] = sortedModels[i + 1];

      if (Math.abs(scoreA - scoreB) < 0.5) {
        const masterRankA = scoresByModel[modelA]?.masterRank ?? 999;
        const masterRankB = scoresByModel[modelB]?.masterRank ?? 999;

        if (masterRankB < masterRankA) {
          finalScores[modelB] += 0.1;
        }
      }
    }

    return finalScores;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Clean up any incomplete (failed or running) steps before executing a new step.
   * This ensures we retry failed steps rather than skipping them.
   * - Failed steps: Delete them so the same action can be retried
   * - Running steps: Mark as failed (stuck from previous crash/timeout)
   */
  private async cleanupIncompleteSteps(roundId: string): Promise<void> {
    // Find any incomplete steps
    const incompleteSteps = await db
      .select()
      .from(schema.roundSteps)
      .where(
        and(
          eq(schema.roundSteps.roundId, roundId),
          inArray(schema.roundSteps.status, ['failed', 'running'])
        )
      );

    if (incompleteSteps.length === 0) {
      return;
    }

    for (const step of incompleteSteps) {
      logger.info({
        stepId: step.id,
        stepType: step.stepType,
        status: step.status,
        actorModelId: step.actorModelId,
        roundId,
      }, 'Cleaning up incomplete step for retry');

      // Delete any judgments associated with this step (for judge steps)
      if (step.stepType === 'model_judge' && step.actorModelId) {
        await db
          .delete(schema.modelJudgments)
          .where(
            and(
              eq(schema.modelJudgments.roundId, roundId),
              eq(schema.modelJudgments.judgeModelId, step.actorModelId)
            )
          );
      }

      // Delete the incomplete step
      await db
        .delete(schema.roundSteps)
        .where(eq(schema.roundSteps.id, step.id));

      // Emit event so UI knows about the cleanup
      this.emitEvent('step_cleaned_up', {
        stepId: step.id,
        stepType: step.stepType,
        actorModelId: step.actorModelId,
        previousStatus: step.status,
        roundId,
      });
    }
  }

  /**
   * Get models in clockwise order starting from the position AFTER the given index.
   * For example, if modelIds = [A, B, C, D] and startIndex = 1 (B is master),
   * returns [C, D, A, B] - starting from the model after B.
   */
  private getClockwiseOrder(modelIds: string[], startIndex: number): string[] {
    const result: string[] = [];
    const len = modelIds.length;
    // Start from the position AFTER startIndex
    for (let i = 1; i <= len; i++) {
      result.push(modelIds[(startIndex + i) % len]);
    }
    return result;
  }

  private async getRound(roundId: string): Promise<schema.Round | null> {
    const [round] = await db
      .select()
      .from(schema.rounds)
      .where(eq(schema.rounds.id, roundId));
    return round ?? null;
  }

  private async getStep(stepId: string): Promise<schema.RoundStep | null> {
    const [step] = await db
      .select()
      .from(schema.roundSteps)
      .where(eq(schema.roundSteps.id, stepId));
    return step ?? null;
  }

  private async getRoundInfo(roundId: string): Promise<import('@sabe/shared').RoundInfo | null> {
    const round = await this.getRound(roundId);
    if (!round) return null;

    const [master] = await db
      .select()
      .from(schema.models)
      .where(eq(schema.models.id, round.masterId));

    const [topic] = round.topicId
      ? await db.select().from(schema.questionTypes).where(eq(schema.questionTypes.id, round.topicId))
      : [null];

    return {
      id: round.id,
      sessionId: round.sessionId,
      roundNumber: round.roundNumber,
      status: round.status as RoundStatus,
      masterId: round.masterId,
      masterName: master?.displayName,
      topicId: round.topicId,
      topicName: topic?.name,
      questionContent: round.questionContent,
      questionDifficulty: round.questionDifficulty as import('@sabe/shared').QuestionDifficulty | null,
      startedAt: round.startedAt?.toISOString() ?? null,
      completedAt: round.completedAt?.toISOString() ?? null,
      createdAt: round.createdAt.toISOString(),
    };
  }

  private mapStepToInfo(step: schema.RoundStep): StepInfo {
    return {
      id: step.id,
      roundId: step.roundId,
      stepNumber: step.stepNumber,
      stepType: step.stepType as StepType,
      status: step.status as StepStatus,
      actorModelId: step.actorModelId,
      targetModelId: step.targetModelId,
      outputData: step.outputData,
      llmResponseTimeMs: step.llmResponseTimeMs,
      errorMessage: step.errorMessage,
      startedAt: step.startedAt?.toISOString() ?? null,
      completedAt: step.completedAt?.toISOString() ?? null,
    };
  }

  private async getArenaModels(
    modelIds: string[],
    currentRoundId: string | null
  ): Promise<ArenaModel[]> {
    const models = await db
      .select()
      .from(schema.models)
      .where(inArray(schema.models.id, modelIds));

    const modelMap = new Map(models.map(m => [m.id, m]));

    // Get current round answers and judgments
    let answeredIds = new Set<string>();
    let judgedIds = new Set<string>();

    if (currentRoundId) {
      const answerSteps = await db
        .select()
        .from(schema.roundSteps)
        .where(
          and(
            eq(schema.roundSteps.roundId, currentRoundId),
            eq(schema.roundSteps.stepType, 'model_answer'),
            eq(schema.roundSteps.status, 'completed')
          )
        );
      answeredIds = new Set(answerSteps.map(s => s.actorModelId!));

      const judgeSteps = await db
        .select()
        .from(schema.roundSteps)
        .where(
          and(
            eq(schema.roundSteps.roundId, currentRoundId),
            eq(schema.roundSteps.stepType, 'model_judge'),
            eq(schema.roundSteps.status, 'completed')
          )
        );
      judgedIds = new Set(judgeSteps.map(s => s.actorModelId!));
    }

    return modelIds.map(id => {
      const model = modelMap.get(id);
      return {
        id,
        displayName: model?.displayName ?? 'Unknown',
        status: this.getModelArenaStatus(id, answeredIds, judgedIds),
        hasAnswered: answeredIds.has(id),
        hasJudged: judgedIds.has(id),
      };
    });
  }

  private getModelArenaStatus(
    modelId: string,
    answeredIds: Set<string>,
    judgedIds: Set<string>
  ): import('@sabe/shared').ArenaModelStatus {
    if (judgedIds.has(modelId)) return 'judged';
    if (answeredIds.has(modelId)) return 'answered';
    return 'idle';
  }

  private async areAllAnswersComplete(
    roundId: string,
    modelIds: string[],
    masterId: string
  ): Promise<boolean> {
    const respondingModels = modelIds.filter(id => id !== masterId);
    const answers = await db
      .select()
      .from(schema.roundSteps)
      .where(
        and(
          eq(schema.roundSteps.roundId, roundId),
          eq(schema.roundSteps.stepType, 'model_answer'),
          eq(schema.roundSteps.status, 'completed')
        )
      );
    return answers.length >= respondingModels.length;
  }

  private async areAllJudgmentsComplete(
    roundId: string,
    modelIds: string[]
  ): Promise<boolean> {
    const judgments = await db
      .select()
      .from(schema.roundSteps)
      .where(
        and(
          eq(schema.roundSteps.roundId, roundId),
          eq(schema.roundSteps.stepType, 'model_judge'),
          eq(schema.roundSteps.status, 'completed')
        )
      );
    return judgments.length >= modelIds.length;
  }

  private async updateRoundStatus(roundId: string, status: RoundStatus): Promise<void> {
    await db
      .update(schema.rounds)
      .set({ status })
      .where(eq(schema.rounds.id, roundId));
  }

  private async failStep(
    stepId: string,
    errorMessage: string,
    context: {
      roundId: string;
      stepType: StepType;
      actorModelId?: string | null;
      actorModelName?: string;
    }
  ): Promise<void> {
    await db
      .update(schema.roundSteps)
      .set({
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
      })
      .where(eq(schema.roundSteps.id, stepId));

    // Emit step_failed event so frontend can reset UI state
    this.emitEvent('step_failed', {
      stepId,
      roundId: context.roundId,
      stepType: context.stepType,
      actorId: context.actorModelId,
      actorName: context.actorModelName,
      error: errorMessage,
    });

    logger.warn({
      stepId,
      roundId: context.roundId,
      stepType: context.stepType,
      actorModelId: context.actorModelId,
      error: errorMessage,
    }, 'Step failed');
  }

  private async failSession(sessionId: string, errorMessage: string): Promise<void> {
    this.activeSessionId = null;
    await db
      .update(schema.gameSessions)
      .set({
        status: 'failed',
        completedAt: new Date(),
      })
      .where(eq(schema.gameSessions.id, sessionId));

    this.emitEvent('session_failed', { sessionId, error: errorMessage });
    logger.error({ sessionId, error: errorMessage }, 'Session failed');
  }

  private async completeSession(sessionId: string): Promise<void> {
    this.activeSessionId = null;
    await db
      .update(schema.gameSessions)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(schema.gameSessions.id, sessionId));

    this.emitEvent('session_completed', { sessionId });
    logger.info({ sessionId }, 'Session completed');
  }

  private emitEvent(type: string, data: Record<string, unknown> = {}): void {
    const event: GameEvent = {
      type,
      timestamp: new Date().toISOString(),
      ...data,
    };
    this.emit('event', event);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute an LLM call with retry logic
   * Retries on transient errors (network, rate limit, timeout)
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const isRetryable = this.isRetryableError(lastError);

        if (!isRetryable || attempt === maxRetries) {
          throw lastError;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        logger.warn({
          attempt: attempt + 1,
          maxRetries,
          delayMs,
          error: lastError.message,
        }, 'LLM call failed, retrying...');

        await this.delay(delayMs);
      }
    }

    throw lastError;
  }

  /**
   * Check if error is retryable (transient network/service errors)
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('503') ||
      message.includes('502') ||
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('socket hang up') ||
      message.includes('fetch failed')
    );
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let engineInstance: GameEngine | null = null;

export function getGameEngine(): GameEngine {
  if (!engineInstance) {
    engineInstance = new GameEngine();
  }
  return engineInstance;
}

export function resetGameEngine(): void {
  engineInstance = null;
}
