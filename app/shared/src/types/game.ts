// Game Types - Shared between server and client
// Types for AI Arena game sessions, rounds, and steps

// =============================================================================
// STATUS ENUMS
// =============================================================================

export type GameSessionStatus = 'created' | 'running' | 'paused' | 'completed' | 'failed';

export type RoundStatus =
  | 'created'
  | 'topic_selection'
  | 'question_creation'
  | 'answering'
  | 'judging'
  | 'scoring'
  | 'completed'
  | 'failed';

export type StepType =
  | 'master_topic'
  | 'master_question'
  | 'model_answer'
  | 'model_judge'
  | 'scoring';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

// =============================================================================
// MODEL STATUS IN ARENA
// =============================================================================

export type ArenaModelStatus =
  | 'idle'
  | 'thinking'
  | 'answered'
  | 'judging'
  | 'judged';

// =============================================================================
// GAME SESSION
// =============================================================================

export interface GameSessionConfig {
  stepDelayMs?: number;
  allowTies?: boolean;
}

export interface CreateSessionOptions {
  totalRounds?: number;
  modelIds?: string[];
  stepDelayMs?: number;
}

export interface GameSessionInfo {
  id: string;
  status: GameSessionStatus;
  totalRounds: number;
  completedRounds: number;
  currentRoundId: string | null;
  participatingModelIds: string[];
  config: GameSessionConfig | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

// =============================================================================
// ROUND
// =============================================================================

export interface RoundInfo {
  id: string;
  sessionId: string;
  roundNumber: number;
  status: RoundStatus;
  masterId: string;
  masterName?: string;
  topicId: string | null;
  topicName?: string;
  questionContent: string | null;
  questionDifficulty: QuestionDifficulty | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

// =============================================================================
// STEP
// =============================================================================

export interface StepInfo {
  id: string;
  roundId: string;
  stepNumber: number;
  stepType: StepType;
  status: StepStatus;
  actorModelId: string | null;
  actorModelName?: string;
  targetModelId: string | null;
  targetModelName?: string;
  outputData: Record<string, unknown> | null;
  llmResponseTimeMs: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

// =============================================================================
// JUDGMENT
// =============================================================================

export interface CriteriaScores {
  accuracy?: number;
  clarity?: number;
  creativity?: number;
  completeness?: number;
}

export interface JudgmentInfo {
  id: string;
  roundId: string;
  judgeModelId: string;
  judgeName?: string;
  targetModelId: string;
  targetName?: string;
  score: number;
  rank: number;
  reasoning: string | null;
  criteriaScores: CriteriaScores | null;
  isMasterJudgment: boolean;
}

// =============================================================================
// CURRENT STATE (for real-time display)
// =============================================================================

export interface ArenaModel {
  id: string;
  displayName: string;
  status: ArenaModelStatus;
  score?: number;
  hasAnswered?: boolean;
  hasJudged?: boolean;
}

export interface CurrentArenaState {
  session: GameSessionInfo | null;
  currentRound: RoundInfo | null;
  currentStep: StepInfo | null;
  models: ArenaModel[];
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'step' | 'score';
}

// =============================================================================
// ROUND SCORES
// =============================================================================

export interface RoundScoreEntry {
  modelId: string;
  modelName: string;
  score: number;
  rank: number;
  previousRank?: number;
  deltaRank?: number;
}

export interface RoundScores {
  roundId: string;
  roundNumber: number;
  scores: RoundScoreEntry[];
}

// =============================================================================
// MODEL DETAIL (for modal)
// =============================================================================

export interface ModelRoundDetail {
  model: {
    id: string;
    displayName: string;
  };
  isMaster: boolean;
  answer: string | null;
  responseTimeMs: number | null;
  judgmentsReceived: JudgmentInfo[];
  judgmentsGiven: JudgmentInfo[];
  finalScore: number | null;
  finalRank: number | null;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface TriggerStepResult {
  step: StepInfo;
  sessionCompleted: boolean;
  roundCompleted: boolean;
}

export interface SessionStartResult {
  sessionId: string;
  status: GameSessionStatus;
  totalRounds: number;
  modelCount: number;
}
