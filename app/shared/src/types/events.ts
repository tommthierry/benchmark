// Arena SSE Event Types
// Shared between server and client for type-safe event handling

import type {
  GameSessionStatus,
  RoundStatus,
  StepType,
  StepStatus,
  ArenaModelStatus,
  QuestionDifficulty,
} from './game.js';

// =============================================================================
// EVENT TYPE ENUM
// =============================================================================

export type ArenaEventType =
  | 'connected'
  | 'state_snapshot'
  | 'session:created'
  | 'session:started'
  | 'session:paused'
  | 'session:completed'
  | 'session:failed'
  | 'round:started'
  | 'round:completed'
  | 'step:started'
  | 'step:completed';

// =============================================================================
// BASE EVENT
// =============================================================================

export interface BaseArenaEvent {
  type: ArenaEventType;
  timestamp: string;
}

// =============================================================================
// CONNECTION EVENTS
// =============================================================================

export interface ConnectedEvent extends BaseArenaEvent {
  type: 'connected';
  message: string;
}

// =============================================================================
// STATE SNAPSHOT (sent on initial connection)
// =============================================================================

export interface StateSnapshotSession {
  id: string;
  status: GameSessionStatus;
  totalRounds: number;
  completedRounds: number;
  currentRoundId: string | null;
}

export interface StateSnapshotRound {
  id: string;
  roundNumber: number;
  status: RoundStatus;
  masterId: string;
  masterName?: string;
  topicId: string | null;
  topicName?: string;
  questionContent: string | null;
  questionDifficulty: QuestionDifficulty | null;
}

export interface StateSnapshotStep {
  id: string;
  stepType: StepType;
  status: StepStatus;
  actorModelId: string | null;
  actorModelName?: string;
}

export interface StateSnapshotModel {
  id: string;
  displayName: string;
  status: ArenaModelStatus;
  hasAnswered?: boolean;
  hasJudged?: boolean;
}

export interface StateSnapshotEvent extends BaseArenaEvent {
  type: 'state_snapshot';
  session: StateSnapshotSession | null;
  currentRound: StateSnapshotRound | null;
  currentStep: StateSnapshotStep | null;
  models: StateSnapshotModel[];
}

// =============================================================================
// SESSION EVENTS
// =============================================================================

export interface SessionCreatedEvent extends BaseArenaEvent {
  type: 'session:created';
  sessionId: string;
  totalRounds: number;
  modelCount: number;
}

export interface SessionStartedEvent extends BaseArenaEvent {
  type: 'session:started';
  sessionId: string;
}

export interface SessionPausedEvent extends BaseArenaEvent {
  type: 'session:paused';
  sessionId: string;
}

export interface SessionCompletedEvent extends BaseArenaEvent {
  type: 'session:completed';
  sessionId: string;
}

export interface SessionFailedEvent extends BaseArenaEvent {
  type: 'session:failed';
  sessionId: string;
  error: string;
}

// =============================================================================
// ROUND EVENTS
// =============================================================================

export interface RoundStartedEvent extends BaseArenaEvent {
  type: 'round:started';
  sessionId: string;
  roundId: string;
  roundNumber: number;
  masterId: string;
  masterName?: string;
}

export interface RoundCompletedEvent extends BaseArenaEvent {
  type: 'round:completed';
  roundId: string;
  roundNumber: number;
  scores: Record<string, number>;
}

// =============================================================================
// STEP EVENTS
// =============================================================================

export interface StepStartedEvent extends BaseArenaEvent {
  type: 'step:started';
  stepId: string;
  roundId: string;
  stepType: StepType;
  actorId?: string;
  actorName?: string;
}

export interface StepCompletedOutput {
  preview?: string;
  selectedTopic?: string;
  question?: string;
  difficulty?: string;
  answerPreview?: string;
  judgmentCount?: number;
  scores?: Record<string, number>;
}

export interface StepCompletedEvent extends BaseArenaEvent {
  type: 'step:completed';
  stepId: string;
  roundId: string;
  stepType: StepType;
  actorId?: string;
  output: StepCompletedOutput;
  responseTimeMs?: number;
}

// =============================================================================
// UNION TYPE
// =============================================================================

export type ArenaEvent =
  | ConnectedEvent
  | StateSnapshotEvent
  | SessionCreatedEvent
  | SessionStartedEvent
  | SessionPausedEvent
  | SessionCompletedEvent
  | SessionFailedEvent
  | RoundStartedEvent
  | RoundCompletedEvent
  | StepStartedEvent
  | StepCompletedEvent;
