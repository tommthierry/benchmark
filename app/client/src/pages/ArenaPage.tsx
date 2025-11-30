// Public Arena Page - Real-time AI competition view
// Redesigned with status bar, color-coded models, collapsible activity

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';
import { useArenaEvents } from '../hooks/useArenaEvents';
import { useArenaActivity } from '../hooks/useArenaActivity';
import { arenaApi } from '../lib/api';
import { ArenaCircle } from '../components/arena/ArenaCircle';
import { GameStatusBar } from '../components/arena/GameStatusBar';
import { QuestionPanel } from '../components/arena/QuestionPanel';
import { ActivityFeed } from '../components/arena/ActivityFeed';
import { RoundProgress } from '../components/arena/RoundProgress';
import { ModelDetailModal } from '../components/arena/ModelDetailModal';
import { RoundCompleteOverlay, type RoundScore } from '../components/arena/RoundCompleteOverlay';
import { fadeIn } from '../styles/animations';
import { getPreviewWords } from '../components/arena/SpeechBubble';
import { getModelColorByIndex } from '../lib/modelColors';
import type {
  StateSnapshotEvent,
  RoundStartedEvent,
  StepStartedEvent,
  StepCompletedEvent,
  StepUndoneEvent,
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
  roundStatus: string | null;
  masterId: string | null;
  masterName: string | null;
  topicName: string | null;
  questionContent: string | null;
  currentStepType: string | null;
  currentActorId: string | null;
  nextActorId: string | null;
  models: Array<{
    id: string;
    displayName: string;
    status: 'idle' | 'thinking' | 'answered' | 'judging' | 'judged';
    hasAnswered?: boolean;
    hasJudged?: boolean;
    answerPreview?: string;
  }>;
  answerPreviews: Record<string, string>;
}

// Helper: Get models in clockwise order starting from the position AFTER the master
// This mirrors the backend getClockwiseOrder logic
function getClockwiseOrderFromMaster(
  models: ArenaDisplayState['models'],
  masterId: string | null
): ArenaDisplayState['models'] {
  if (!masterId) return models;

  const masterIndex = models.findIndex(m => m.id === masterId);
  if (masterIndex === -1) return models;

  const result: ArenaDisplayState['models'] = [];
  const len = models.length;
  // Start from the position AFTER masterIndex (clockwise)
  for (let i = 1; i <= len; i++) {
    result.push(models[(masterIndex + i) % len]);
  }
  return result;
}

// Helper: Determine next actor ID
// During answering: models answer in clockwise order starting from the model AFTER the master
// During judging: responders first in answer order, master LAST
function getNextActorId(
  models: ArenaDisplayState['models'],
  masterId: string | null,
  roundStatus: string | null
): string | null {
  if (!roundStatus) return null;

  if (roundStatus === 'question_creation' || roundStatus === 'answering') {
    // Get models in clockwise order starting from the model AFTER the master
    const clockwiseOrder = getClockwiseOrderFromMaster(models, masterId);
    // Filter out the master, then find the first model that hasn't answered
    const respondingModels = clockwiseOrder.filter(m => m.id !== masterId);
    const next = respondingModels.find(m => !m.hasAnswered);
    return next?.id ?? null;
  }

  if (roundStatus === 'judging') {
    // During judging: responders judge first (in clockwise order), master LAST
    const clockwiseOrder = getClockwiseOrderFromMaster(models, masterId);
    const responders = clockwiseOrder.filter(m => m.id !== masterId);
    const respondersWhoNeedToJudge = responders.filter(m => !m.hasJudged);

    if (respondersWhoNeedToJudge.length > 0) {
      // Find the first responder who hasn't judged (in clockwise order)
      return respondersWhoNeedToJudge[0]?.id ?? null;
    }

    // All responders judged, check if master still needs to judge
    const master = models.find(m => m.id === masterId);
    if (master && !master.hasJudged) {
      return master.id;
    }

    return null;
  }

  return null;
}

export function ArenaPage() {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [arenaState, setArenaState] = useState<ArenaDisplayState | null>(null);
  const [showRoundComplete, setShowRoundComplete] = useState(false);
  const [roundCompleteData, setRoundCompleteData] = useState<{
    roundNumber: number;
    question: string;
    topic?: string;
    masterName?: string;
    scores: RoundScore[];
  } | null>(null);
  const { activities, addActivity } = useArenaActivity({ maxItems: 15 });

  // Fetch initial state via API as fallback
  const { data: initialState, isLoading } = useQuery({
    queryKey: ['arena', 'current'],
    queryFn: arenaApi.getCurrentState,
    refetchInterval: false,
    staleTime: Infinity,
  });

  // Handle state snapshot from SSE
  const handleStateSnapshot = useCallback((data: StateSnapshotEvent) => {
    const roundStatus = data.currentRound?.status ?? null;
    const models = data.models.map((m) => ({
      id: m.id,
      displayName: m.displayName,
      status: m.status,
      hasAnswered: m.hasAnswered,
      hasJudged: m.hasJudged,
      answerPreview: undefined,
    }));
    const masterId = data.currentRound?.masterId ?? null;

    setArenaState({
      sessionId: data.session?.id ?? null,
      sessionStatus: data.session?.status ?? null,
      totalRounds: data.session?.totalRounds ?? 0,
      completedRounds: data.session?.completedRounds ?? 0,
      currentRoundId: data.currentRound?.id ?? null,
      roundNumber: data.currentRound?.roundNumber ?? null,
      roundStatus,
      masterId,
      masterName: data.currentRound?.masterName ?? null,
      topicName: data.currentRound?.topicName ?? null,
      questionContent: data.currentRound?.questionContent ?? null,
      currentStepType: data.currentStep?.stepType ?? null,
      currentActorId: data.currentStep?.actorModelId ?? null,
      nextActorId: getNextActorId(models, masterId, roundStatus),
      models,
      answerPreviews: {},
    });
    addActivity({ type: 'system', message: 'Connected to arena' });
  }, [addActivity]);

  // Handle round started
  const handleRoundStarted = useCallback((data: RoundStartedEvent) => {
    setArenaState((prev) => {
      if (!prev) return null;
      const models = prev.models.map((m) => ({
        ...m,
        status: 'idle' as const,
        hasAnswered: false,
        hasJudged: false,
        answerPreview: undefined,
      }));
      return {
        ...prev,
        currentRoundId: data.roundId,
        roundNumber: data.roundNumber,
        roundStatus: 'created',
        masterId: data.masterId,
        masterName: data.masterName ?? null,
        topicName: null,
        questionContent: null,
        currentStepType: null,
        currentActorId: null,
        nextActorId: null,
        models,
        answerPreviews: {},
      };
    });
    addActivity({
      type: 'info',
      message: `Round ${data.roundNumber} started. Master: ${data.masterName ?? 'Unknown'}`,
    });
  }, [addActivity]);

  // Handle step started
  const handleStepStarted = useCallback((data: StepStartedEvent) => {
    setArenaState((prev) => {
      if (!prev) return null;

      let roundStatus = prev.roundStatus;
      if (data.stepType === 'master_topic') roundStatus = 'topic_selection';
      else if (data.stepType === 'master_question') roundStatus = 'question_creation';
      else if (data.stepType === 'model_answer') roundStatus = 'answering';
      else if (data.stepType === 'model_judge') roundStatus = 'judging';
      else if (data.stepType === 'scoring') roundStatus = 'scoring';

      // Check if we're transitioning TO judging phase
      const isTransitioningToJudging =
        data.stepType === 'model_judge' && prev.roundStatus !== 'judging';

      const models = prev.models.map((m) => ({
        ...m,
        status: m.id === data.actorId
          ? (data.stepType === 'model_judge' ? 'judging' as const : 'thinking' as const)
          : m.status,
        // Clear answer preview when entering judging phase
        answerPreview: isTransitioningToJudging ? undefined : m.answerPreview,
      }));

      return {
        ...prev,
        currentStepType: data.stepType,
        currentActorId: data.actorId ?? null,
        roundStatus,
        models,
        // Clear answer previews when entering judging phase
        answerPreviews: isTransitioningToJudging ? {} : prev.answerPreviews,
        nextActorId: getNextActorId(models, prev.masterId, roundStatus),
      };
    });

    const stepLabel = getStepLabel(data.stepType);
    const actorLabel = data.actorName ? ` (${data.actorName})` : '';
    addActivity({ type: 'step', message: `${stepLabel}${actorLabel}...` });
  }, [addActivity]);

  // Handle step completed
  const handleStepCompleted = useCallback((data: StepCompletedEvent) => {
    setArenaState((prev) => {
      if (!prev) return null;

      let updatedState = { ...prev, currentStepType: null, currentActorId: null };

      if (data.stepType === 'master_topic' && data.output.selectedTopic) {
        updatedState.topicName = data.output.selectedTopic;
      } else if (data.stepType === 'master_question' && data.output.question) {
        updatedState.questionContent = data.output.question;
        updatedState.roundStatus = 'answering';
      }

      if (data.stepType === 'model_answer' && data.actorId && data.output.answerPreview) {
        const preview = getPreviewWords(String(data.output.answerPreview), 15);
        updatedState.answerPreviews = {
          ...updatedState.answerPreviews,
          [data.actorId]: preview,
        };
      }

      updatedState.models = prev.models.map((m) => {
        const answerPreview = updatedState.answerPreviews[m.id];

        if (m.id !== data.actorId) {
          return { ...m, answerPreview };
        }

        if (data.stepType === 'model_answer') {
          return { ...m, status: 'answered' as const, hasAnswered: true, answerPreview };
        }
        if (data.stepType === 'model_judge') {
          return { ...m, status: 'judged' as const, hasJudged: true, answerPreview };
        }
        return { ...m, status: 'idle' as const, answerPreview };
      });

      updatedState.nextActorId = getNextActorId(
        updatedState.models,
        updatedState.masterId,
        updatedState.roundStatus
      );

      return updatedState;
    });

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

  // Handle step undone
  const handleStepUndone = useCallback((data: StepUndoneEvent) => {
    setArenaState((prev) => {
      if (!prev) return null;

      let updatedState = { ...prev };

      if (data.clearedFields.topicId) {
        updatedState.topicName = null;
      }
      if (data.clearedFields.questionContent) {
        updatedState.questionContent = null;
      }

      updatedState.roundStatus = data.newRoundStatus;
      updatedState.currentStepType = null;
      updatedState.currentActorId = null;

      if (data.deletedStepType === 'model_answer' && data.deletedActorId) {
        updatedState.models = prev.models.map((m) => {
          if (m.id === data.deletedActorId) {
            return { ...m, status: 'idle' as const, hasAnswered: false, answerPreview: undefined };
          }
          return m;
        });
        const { [data.deletedActorId]: _, ...restPreviews } = updatedState.answerPreviews;
        updatedState.answerPreviews = restPreviews;
      } else if (data.deletedStepType === 'model_judge' && data.deletedActorId) {
        updatedState.models = prev.models.map((m) => {
          if (m.id === data.deletedActorId) {
            return { ...m, status: 'idle' as const, hasJudged: false };
          }
          return m;
        });
      } else {
        updatedState.models = prev.models.map((m) => ({ ...m, status: 'idle' as const }));
      }

      updatedState.nextActorId = getNextActorId(
        updatedState.models,
        updatedState.masterId,
        updatedState.roundStatus
      );

      return updatedState;
    });

    addActivity({ type: 'info', message: 'Step reverted' });
  }, [addActivity]);

  // Handle round completed
  const handleRoundCompleted = useCallback((data: RoundCompletedEvent) => {
    const scoreEntries = Object.entries(data.scores);
    const sortedScores = scoreEntries
      .sort(([, a], [, b]) => b - a)
      .map(([modelId, score], index): RoundScore => {
        const model = arenaState?.models.find(m => m.id === modelId);
        return {
          modelId,
          modelName: model?.displayName ?? 'Unknown',
          score,
          rank: index + 1,
          isMaster: modelId === arenaState?.masterId,
        };
      });

    setRoundCompleteData({
      roundNumber: data.roundNumber,
      question: arenaState?.questionContent ?? '',
      topic: arenaState?.topicName ?? undefined,
      masterName: arenaState?.masterName ?? undefined,
      scores: sortedScores,
    });

    setShowRoundComplete(true);

    setArenaState((prev) => prev ? {
      ...prev,
      completedRounds: data.roundNumber,
      models: prev.models.map((m) => ({ ...m, status: 'idle' as const, hasAnswered: false, hasJudged: false, answerPreview: undefined })),
      answerPreviews: {},
      roundStatus: 'completed',
      questionContent: null,
      topicName: null,
      currentRoundId: null,
      nextActorId: null,
    } : null);

    addActivity({ type: 'score', message: `Round ${data.roundNumber} complete!` });
  }, [arenaState, addActivity]);

  // Connect to SSE
  const { isConnected, reconnectAttempts } = useArenaEvents({
    onStateSnapshot: handleStateSnapshot,
    onRoundStarted: handleRoundStarted,
    onStepStarted: handleStepStarted,
    onStepCompleted: handleStepCompleted,
    onStepUndone: handleStepUndone,
    onRoundCompleted: handleRoundCompleted,
  });

  // Use API data as fallback
  const displayState = arenaState ?? (initialState?.data ? {
    sessionId: initialState.data.session?.id ?? null,
    sessionStatus: initialState.data.session?.status ?? null,
    totalRounds: initialState.data.session?.totalRounds ?? 0,
    completedRounds: initialState.data.session?.completedRounds ?? 0,
    currentRoundId: initialState.data.currentRound?.id ?? null,
    roundNumber: initialState.data.currentRound?.roundNumber ?? null,
    roundStatus: initialState.data.currentRound?.status ?? null,
    masterId: initialState.data.currentRound?.masterId ?? null,
    masterName: initialState.data.currentRound?.masterName ?? null,
    topicName: initialState.data.currentRound?.topicName ?? null,
    questionContent: initialState.data.currentRound?.questionContent ?? null,
    currentStepType: initialState.data.currentStep?.stepType ?? null,
    currentActorId: initialState.data.currentStep?.actorModelId ?? null,
    nextActorId: null,
    models: initialState.data.models.map((m) => ({
      id: m.id,
      displayName: m.displayName,
      status: m.status,
      hasAnswered: m.hasAnswered,
      hasJudged: m.hasJudged,
      answerPreview: undefined,
    })),
    answerPreviews: {},
  } : null);

  // Build model color map for status bar
  const modelColorMap = useMemo(() => {
    if (!displayState) return {};
    const map: Record<string, { id: string; displayName: string; color: string }> = {};
    displayState.models.forEach((m, i) => {
      map[m.id] = { id: m.id, displayName: m.displayName, color: getModelColorByIndex(i) };
    });
    return map;
  }, [displayState]);

  // Get master color
  const masterColor = displayState?.masterId ? modelColorMap[displayState.masterId]?.color : undefined;

  // Modal navigation handler
  const handleModalNavigate = useCallback((direction: 'prev' | 'next') => {
    if (!displayState || !selectedModelId) return;

    const modelIds = displayState.models.map(m => m.id);
    const currentIndex = modelIds.indexOf(selectedModelId);

    if (direction === 'prev' && currentIndex > 0) {
      setSelectedModelId(modelIds[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < modelIds.length - 1) {
      setSelectedModelId(modelIds[currentIndex + 1]);
    }
  }, [displayState, selectedModelId]);

  // Get selected model index for navigation
  const selectedModelIndex = displayState?.models.findIndex(m => m.id === selectedModelId) ?? -1;

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
      {/* Header */}
      <header className="px-4 md:px-6 py-3 flex items-center justify-between border-b border-[var(--color-bg-tertiary)]">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg md:text-xl font-medium text-[var(--color-text-primary)]">
              AI Arena
            </h1>
          </div>
          <ConnectionStatus isConnected={isConnected} reconnectAttempts={reconnectAttempts} />
        </div>
        <RoundProgress
          current={displayState.completedRounds ?? 0}
          total={displayState.totalRounds ?? 0}
        />
      </header>

      {/* Status Bar */}
      <div className="px-4 md:px-6 py-3">
        <GameStatusBar
          sessionStatus={displayState.sessionStatus ?? undefined}
          roundStatus={displayState.roundStatus ?? undefined}
          currentStepType={displayState.currentStepType ?? undefined}
          currentActor={displayState.currentActorId ? modelColorMap[displayState.currentActorId] : undefined}
          master={displayState.masterId ? modelColorMap[displayState.masterId] : undefined}
          roundNumber={displayState.roundNumber ?? undefined}
          totalRounds={displayState.totalRounds ?? undefined}
        />
      </div>

      {/* Main content */}
      <main className="px-4 md:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Arena Circle */}
          <div className="lg:col-span-7 xl:col-span-8">
            <ArenaCircle
              models={displayState.models}
              masterId={displayState.masterId ?? undefined}
              currentActorId={displayState.currentActorId ?? undefined}
              nextActorId={displayState.nextActorId ?? undefined}
              roundPhase={
                displayState.roundStatus === 'answering' ? 'answering' :
                displayState.roundStatus === 'judging' ? 'judging' : null
              }
              onModelClick={setSelectedModelId}
            />
          </div>

          {/* Side panel */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            {/* Current Question */}
            <QuestionPanel
              question={displayState.questionContent}
              topic={displayState.topicName ?? undefined}
              masterName={displayState.masterName ?? undefined}
              masterColor={masterColor}
            />

            {/* Activity Feed - collapsed by default */}
            <ActivityFeed activities={activities} defaultCollapsed={true} />
          </div>
        </div>
      </main>

      {/* Model Detail Modal */}
      {selectedModelId && (
        <ModelDetailModal
          modelId={selectedModelId}
          roundId={displayState.currentRoundId ?? undefined}
          onClose={() => setSelectedModelId(null)}
          onNavigate={handleModalNavigate}
          hasPrev={selectedModelIndex > 0}
          hasNext={selectedModelIndex < displayState.models.length - 1}
        />
      )}

      {/* Round Complete Overlay */}
      {roundCompleteData && (
        <RoundCompleteOverlay
          isVisible={showRoundComplete}
          roundNumber={roundCompleteData.roundNumber}
          question={roundCompleteData.question}
          topic={roundCompleteData.topic}
          masterName={roundCompleteData.masterName}
          scores={roundCompleteData.scores}
          onClose={() => setShowRoundComplete(false)}
          onNextRound={() => setShowRoundComplete(false)}
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
      <div className="text-center max-w-lg px-6">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-[var(--color-bg-tertiary)]"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <div className="absolute inset-3 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center">
            {isConnected ? (
              <Wifi className="w-6 h-6 text-[var(--color-text-muted)]" />
            ) : (
              <WifiOff className="w-6 h-6 text-[var(--color-text-muted)]" />
            )}
          </div>
        </div>

        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
          {isConnected ? 'Arena Ready' : 'Connecting...'}
        </h2>

        <p className="text-sm text-[var(--color-text-secondary)] mb-3">
          {isConnected
            ? 'Waiting for a game session to begin.'
            : 'Attempting to connect to the arena server...'}
        </p>

        <div className="text-xs text-[var(--color-text-muted)]">
          {isConnected ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
              Connected
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--color-warning)] animate-pulse" />
              Reconnecting...
            </span>
          )}
        </div>
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
      <span className="text-[var(--color-text-muted)]">
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
