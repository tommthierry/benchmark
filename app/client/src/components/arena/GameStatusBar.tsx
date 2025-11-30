// Game status bar - shows current step, active model, phase
// Replaces the center bubble with a more informative header

import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Zap } from 'lucide-react';

interface Model {
  id: string;
  displayName: string;
  color: string;
}

interface GameStatusBarProps {
  sessionStatus?: string;
  roundStatus?: string;
  currentStepType?: string;
  currentActor?: Model;
  master?: Model;
  roundNumber?: number;
  totalRounds?: number;
}

export function GameStatusBar({
  sessionStatus,
  roundStatus,
  currentStepType,
  currentActor,
  master,
  roundNumber,
  totalRounds,
}: GameStatusBarProps) {
  const { label: phaseLabel, description: phaseDescription } = getPhaseInfo(sessionStatus, roundStatus, currentStepType);
  const isActive = !!currentActor;

  return (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)] rounded-lg p-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Phase indicator */}
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-[var(--color-accent)] animate-pulse' : 'bg-[var(--color-text-muted)]'}`} />
          <div>
            <div className="text-sm font-medium text-[var(--color-text-primary)]">
              {phaseLabel}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              {phaseDescription}
            </div>
          </div>
        </div>

        {/* Current actor */}
        <AnimatePresence mode="wait">
          {currentActor && (
            <motion.div
              key={currentActor.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span className="text-xs text-[var(--color-text-muted)]">Acting:</span>
              <ModelBadge model={currentActor} isActive />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Master indicator */}
        {master && (
          <div className="flex items-center gap-2">
            <Crown className="w-3.5 h-3.5 text-[var(--color-master)]" />
            <span className="text-xs text-[var(--color-text-muted)]">Master:</span>
            <ModelBadge model={master} isMaster />
          </div>
        )}

        {/* Round counter */}
        {roundNumber && totalRounds && (
          <div className="text-xs text-[var(--color-text-muted)] tabular-nums">
            Round {roundNumber}/{totalRounds}
          </div>
        )}
      </div>
    </div>
  );
}

function ModelBadge({ model, isActive, isMaster }: { model: Model; isActive?: boolean; isMaster?: boolean }) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium
        ${isActive ? 'ring-1 ring-[var(--color-accent)]' : ''}
      `}
      style={{
        backgroundColor: `color-mix(in srgb, ${model.color} 15%, var(--color-bg-tertiary))`,
        borderLeft: `3px solid ${model.color}`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: model.color }}
      />
      <span className="text-[var(--color-text-primary)]">
        {model.displayName}
      </span>
    </span>
  );
}

function getPhaseInfo(
  sessionStatus?: string,
  roundStatus?: string,
  stepType?: string
): { label: string; description: string } {
  // Active step takes priority
  if (stepType) {
    const stepInfo: Record<string, { label: string; description: string }> = {
      master_topic: { label: 'Topic Selection', description: 'Master is choosing a topic' },
      master_question: { label: 'Question Creation', description: 'Master is crafting a question' },
      model_answer: { label: 'Answering', description: 'Model is responding' },
      model_judge: { label: 'Judging', description: 'Model is evaluating answers' },
      scoring: { label: 'Scoring', description: 'Calculating round scores' },
    };
    return stepInfo[stepType] ?? { label: 'Processing', description: 'Step in progress' };
  }

  // Round status when no active step
  if (roundStatus) {
    const roundInfo: Record<string, { label: string; description: string }> = {
      created: { label: 'Starting Round', description: 'Preparing next round' },
      topic_selection: { label: 'Topic Phase', description: 'Waiting for topic' },
      question_creation: { label: 'Question Phase', description: 'Waiting for question' },
      answering: { label: 'Answer Phase', description: 'Models are responding' },
      judging: { label: 'Judging Phase', description: 'Peer evaluation' },
      scoring: { label: 'Scoring', description: 'Tallying results' },
      completed: { label: 'Round Complete', description: 'Preparing next round' },
    };
    return roundInfo[roundStatus] ?? { label: roundStatus, description: '' };
  }

  // Session status when no round
  if (sessionStatus) {
    const sessionInfo: Record<string, { label: string; description: string }> = {
      created: { label: 'Ready', description: 'Waiting to start' },
      running: { label: 'Running', description: 'Game in progress' },
      paused: { label: 'Paused', description: 'Game paused' },
      completed: { label: 'Finished', description: 'Game complete' },
    };
    return sessionInfo[sessionStatus] ?? { label: 'Unknown', description: sessionStatus };
  }

  return { label: 'No Game', description: 'Start a session to begin' };
}
