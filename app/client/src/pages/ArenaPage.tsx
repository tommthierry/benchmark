// Public Arena Page - Real-time AI competition view
// Designed to avoid AI-generated design patterns

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';
import { useArenaEvents } from '../hooks/useArenaEvents';
import { useArenaActivity, type ActivityItem } from '../hooks/useArenaActivity';
import { arenaApi } from '../lib/api';
import { ArenaCircle } from '../components/arena/ArenaCircle';
import { QuestionPanel } from '../components/arena/QuestionPanel';
import { ActivityFeed } from '../components/arena/ActivityFeed';
import { RoundProgress } from '../components/arena/RoundProgress';
import { ModelDetailModal } from '../components/arena/ModelDetailModal';
import { fadeIn } from '../styles/animations';
import type {
  StateSnapshotEvent,
  RoundStartedEvent,
  StepStartedEvent,
  StepCompletedEvent,
  RoundCompletedEvent,
} from '@sabe/shared';

// Local state for arena display
interface ArenaDisplayState {
  sessionId: string | null;
  sessionStatus: string | null;
  totalRounds: number;
  completedRounds: number;
  currentRoundId: string | null;
  roundNumber: number | null;
  masterId: string | null;
  masterName: string | null;
  topicName: string | null;
  questionContent: string | null;
  currentStepType: string | null;
  currentActorId: string | null;
  models: Array<{
    id: string;
    displayName: string;
    status: 'idle' | 'thinking' | 'answered' | 'judging' | 'judged';
    hasAnswered?: boolean;
    hasJudged?: boolean;
  }>;
}

export function ArenaPage() {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [arenaState, setArenaState] = useState<ArenaDisplayState | null>(null);
  const { activities, addActivity, clearActivities } = useArenaActivity({ maxItems: 15 });

  // Fetch initial state via API as fallback
  const { data: initialState, isLoading } = useQuery({
    queryKey: ['arena', 'current'],
    queryFn: arenaApi.getCurrentState,
    refetchInterval: false,
    staleTime: Infinity,
  });

  // Handle state snapshot from SSE
  const handleStateSnapshot = useCallback((data: StateSnapshotEvent) => {
    setArenaState({
      sessionId: data.session?.id ?? null,
      sessionStatus: data.session?.status ?? null,
      totalRounds: data.session?.totalRounds ?? 0,
      completedRounds: data.session?.completedRounds ?? 0,
      currentRoundId: data.currentRound?.id ?? null,
      roundNumber: data.currentRound?.roundNumber ?? null,
      masterId: data.currentRound?.masterId ?? null,
      masterName: data.currentRound?.masterName ?? null,
      topicName: data.currentRound?.topicName ?? null,
      questionContent: data.currentRound?.questionContent ?? null,
      currentStepType: data.currentStep?.stepType ?? null,
      currentActorId: data.currentStep?.actorModelId ?? null,
      models: data.models.map((m) => ({
        id: m.id,
        displayName: m.displayName,
        status: m.status,
        hasAnswered: m.hasAnswered,
        hasJudged: m.hasJudged,
      })),
    });
    addActivity({ type: 'system', message: 'Connected to arena' });
  }, [addActivity]);

  // Handle round started
  const handleRoundStarted = useCallback((data: RoundStartedEvent) => {
    setArenaState((prev) => prev ? {
      ...prev,
      currentRoundId: data.roundId,
      roundNumber: data.roundNumber,
      masterId: data.masterId,
      masterName: data.masterName ?? null,
      topicName: null,
      questionContent: null,
      currentStepType: null,
      currentActorId: null,
      models: prev.models.map((m) => ({ ...m, status: 'idle' as const, hasAnswered: false, hasJudged: false })),
    } : null);
    addActivity({
      type: 'info',
      message: `Round ${data.roundNumber} started. Master: ${data.masterName ?? 'Unknown'}`,
    });
  }, [addActivity]);

  // Handle step started
  const handleStepStarted = useCallback((data: StepStartedEvent) => {
    setArenaState((prev) => prev ? {
      ...prev,
      currentStepType: data.stepType,
      currentActorId: data.actorId ?? null,
      models: prev.models.map((m) => ({
        ...m,
        status: m.id === data.actorId
          ? (data.stepType === 'model_judge' ? 'judging' as const : 'thinking' as const)
          : m.status,
      })),
    } : null);

    const stepLabel = getStepLabel(data.stepType);
    const actorLabel = data.actorName ? ` (${data.actorName})` : '';
    addActivity({ type: 'step', message: `${stepLabel}${actorLabel}...` });
  }, [addActivity]);

  // Handle step completed
  const handleStepCompleted = useCallback((data: StepCompletedEvent) => {
    setArenaState((prev) => {
      if (!prev) return null;

      let updatedState = { ...prev, currentStepType: null, currentActorId: null };

      // Update based on step type
      if (data.stepType === 'master_topic' && data.output.selectedTopic) {
        updatedState.topicName = data.output.selectedTopic;
      } else if (data.stepType === 'master_question' && data.output.question) {
        updatedState.questionContent = data.output.question;
      }

      // Update model status
      updatedState.models = prev.models.map((m) => {
        if (m.id !== data.actorId) return m;
        if (data.stepType === 'model_answer') {
          return { ...m, status: 'answered' as const, hasAnswered: true };
        }
        if (data.stepType === 'model_judge') {
          return { ...m, status: 'judged' as const, hasJudged: true };
        }
        return { ...m, status: 'idle' as const };
      });

      return updatedState;
    });

    // Add activity based on step type
    if (data.stepType === 'master_topic') {
      addActivity({ type: 'step', message: `Topic selected: ${data.output.selectedTopic}` });
    } else if (data.stepType === 'master_question') {
      addActivity({ type: 'step', message: 'Question created' });
    } else if (data.stepType === 'model_answer') {
      addActivity({ type: 'step', message: `Answer received` });
    } else if (data.stepType === 'model_judge') {
      addActivity({ type: 'step', message: `Judgment submitted` });
    }
  }, [addActivity]);

  // Handle round completed
  const handleRoundCompleted = useCallback((data: RoundCompletedEvent) => {
    setArenaState((prev) => prev ? {
      ...prev,
      completedRounds: data.roundNumber,
      models: prev.models.map((m) => ({ ...m, status: 'idle' as const })),
    } : null);

    addActivity({
      type: 'score',
      message: `Round ${data.roundNumber} complete! Scores updated.`,
    });
  }, [addActivity]);

  // Connect to SSE
  const { isConnected, reconnectAttempts } = useArenaEvents({
    onStateSnapshot: handleStateSnapshot,
    onRoundStarted: handleRoundStarted,
    onStepStarted: handleStepStarted,
    onStepCompleted: handleStepCompleted,
    onRoundCompleted: handleRoundCompleted,
  });

  // Use API data as fallback if no SSE state yet
  const displayState = arenaState ?? (initialState?.data ? {
    sessionId: initialState.data.session?.id ?? null,
    sessionStatus: initialState.data.session?.status ?? null,
    totalRounds: initialState.data.session?.totalRounds ?? 0,
    completedRounds: initialState.data.session?.completedRounds ?? 0,
    currentRoundId: initialState.data.currentRound?.id ?? null,
    roundNumber: initialState.data.currentRound?.roundNumber ?? null,
    masterId: initialState.data.currentRound?.masterId ?? null,
    masterName: initialState.data.currentRound?.masterName ?? null,
    topicName: initialState.data.currentRound?.topicName ?? null,
    questionContent: initialState.data.currentRound?.questionContent ?? null,
    currentStepType: initialState.data.currentStep?.stepType ?? null,
    currentActorId: initialState.data.currentStep?.actorModelId ?? null,
    models: initialState.data.models.map((m) => ({
      id: m.id,
      displayName: m.displayName,
      status: m.status,
      hasAnswered: m.hasAnswered,
      hasJudged: m.hasJudged,
    })),
  } : null);

  // Loading state
  if (isLoading && !arenaState) {
    return <ArenaLoadingState />;
  }

  // No session state
  if (!displayState || displayState.models.length === 0) {
    return <ArenaEmptyState isConnected={isConnected} />;
  }

  return (
    <motion.div
      className="min-h-screen bg-[var(--color-bg-primary)]"
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      {/* Header - minimal, asymmetric */}
      <header className="px-4 md:px-6 py-4 flex items-center justify-between border-b border-[var(--color-bg-tertiary)]">
        <div>
          <h1 className="text-xl md:text-2xl font-medium text-[var(--color-text-primary)]">
            AI Arena
          </h1>
          <p className="text-xs md:text-sm text-[var(--color-text-muted)] mt-1">
            Round {displayState.roundNumber ?? '-'} of {displayState.totalRounds ?? '-'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionStatus isConnected={isConnected} reconnectAttempts={reconnectAttempts} />
          <RoundProgress
            current={displayState.completedRounds ?? 0}
            total={displayState.totalRounds ?? 0}
          />
        </div>
      </header>

      {/* Main content - asymmetric grid */}
      <main className="px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Arena Circle - takes most space */}
          <div className="lg:col-span-7 xl:col-span-8">
            <ArenaCircle
              models={displayState.models}
              masterId={displayState.masterId ?? undefined}
              currentActorId={displayState.currentActorId ?? undefined}
              currentStepType={displayState.currentStepType ?? undefined}
              onModelClick={setSelectedModelId}
            />
          </div>

          {/* Side panel - narrower, different rhythm */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            {/* Current Question */}
            <QuestionPanel
              question={displayState.questionContent}
              topic={displayState.topicName ?? undefined}
              masterName={displayState.masterName ?? undefined}
            />

            {/* Live Activity Feed */}
            <ActivityFeed activities={activities} />
          </div>
        </div>
      </main>

      {/* Model Detail Modal */}
      {selectedModelId && (
        <ModelDetailModal
          modelId={selectedModelId}
          roundId={displayState.currentRoundId ?? undefined}
          onClose={() => setSelectedModelId(null)}
        />
      )}
    </motion.div>
  );
}

// Helper Components

function ArenaLoadingState() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[var(--color-text-muted)] mt-4 text-sm">
          Connecting to arena...
        </p>
      </div>
    </div>
  );
}

function ArenaEmptyState({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
          {isConnected ? (
            <Wifi className="w-8 h-8 text-[var(--color-text-muted)]" />
          ) : (
            <WifiOff className="w-8 h-8 text-[var(--color-text-muted)]" />
          )}
        </div>
        <h2 className="text-xl font-medium text-[var(--color-text-primary)] mb-2">
          No Active Session
        </h2>
        <p className="text-[var(--color-text-secondary)] text-sm">
          The arena is waiting for a game session to begin.
          {!isConnected && ' Reconnecting...'}
        </p>
      </div>
    </div>
  );
}

function ConnectionStatus({ isConnected, reconnectAttempts }: { isConnected: boolean; reconnectAttempts: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]'
        }`}
      />
      <span className="text-[var(--color-text-muted)] hidden md:inline">
        {isConnected ? 'Live' : `Reconnecting${reconnectAttempts > 0 ? ` (${reconnectAttempts})` : ''}`}
      </span>
    </div>
  );
}

function getStepLabel(stepType: string): string {
  switch (stepType) {
    case 'master_topic':
      return 'Master selecting topic';
    case 'master_question':
      return 'Master creating question';
    case 'model_answer':
      return 'Model answering';
    case 'model_judge':
      return 'Model judging';
    case 'scoring':
      return 'Calculating scores';
    default:
      return 'Processing';
  }
}
