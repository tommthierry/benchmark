// Circular arena layout using SVG
// Models arranged in a circle, master highlighted, current actor animated

import { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ModelNode } from './ModelNode';

interface Model {
  id: string;
  displayName: string;
  status: 'idle' | 'thinking' | 'answered' | 'judging' | 'judged';
  hasAnswered?: boolean;
  hasJudged?: boolean;
  answerPreview?: string; // First ~15 words of answer
}

interface ArenaCircleProps {
  models: Model[];
  masterId?: string;
  currentActorId?: string;
  nextActorId?: string; // ID of model that will act next
  currentStepType?: string;
  sessionStatus?: string; // created, running, paused, completed
  roundStatus?: string; // topic_selection, answering, judging, scoring, completed
  onModelClick: (id: string) => void;
}

export function ArenaCircle({
  models,
  masterId,
  currentActorId,
  nextActorId,
  currentStepType,
  sessionStatus,
  roundStatus,
  onModelClick,
}: ArenaCircleProps) {
  // Calculate positions using circular math
  // Responsive sizing based on model count
  const { positions, viewBox } = useMemo(() => {
    const count = models.length;
    const centerX = 300;
    const centerY = 300;
    // Adjust radius based on model count for better spacing
    const baseRadius = count <= 4 ? 180 : count <= 8 ? 200 : 220;
    const vb = '0 0 600 600';

    const pos = models.map((model, index) => {
      // Start from top (-90deg) and go clockwise
      const angle = ((2 * Math.PI) / count) * index - Math.PI / 2;
      return {
        model,
        x: centerX + baseRadius * Math.cos(angle),
        y: centerY + baseRadius * Math.sin(angle),
        angle: (angle * 180) / Math.PI + 90,
      };
    });

    return { positions: pos, viewBox: vb };
  }, [models]);

  return (
    <div className="relative w-full max-w-[600px] mx-auto">
      <svg
        viewBox={viewBox}
        className="w-full h-auto"
        style={{ overflow: 'visible' }}
      >
        {/* Defs for filters and gradients */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="centerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-bg-tertiary)" />
            <stop offset="100%" stopColor="var(--color-bg-elevated)" />
          </linearGradient>
        </defs>

        {/* Subtle connecting lines between nodes */}
        <g opacity="0.08">
          {positions.map((pos, i) => {
            const next = positions[(i + 1) % positions.length];
            return (
              <line
                key={`line-${i}`}
                x1={pos.x}
                y1={pos.y}
                x2={next.x}
                y2={next.y}
                stroke="var(--color-text-muted)"
                strokeWidth="1"
              />
            );
          })}
        </g>

        {/* Center decorative element */}
        <circle
          cx="300"
          cy="300"
          r="65"
          fill="url(#centerGradient)"
          stroke="var(--color-bg-elevated)"
          strokeWidth="2"
        />

        {/* Center status text */}
        {(() => {
          const { label, sublabel, color } = getCenterStatus(sessionStatus, roundStatus, currentStepType);
          return (
            <>
              <text
                x="300"
                y="295"
                textAnchor="middle"
                fill={color}
                fontSize="13"
                fontFamily="inherit"
                fontWeight="500"
              >
                {label}
              </text>
              <text
                x="300"
                y="315"
                textAnchor="middle"
                fill="var(--color-text-muted)"
                fontSize="11"
                fontFamily="inherit"
              >
                {sublabel}
              </text>
            </>
          );
        })()}

        {/* Model nodes */}
        <AnimatePresence mode="sync">
          {positions.map(({ model, x, y }) => (
            <ModelNode
              key={model.id}
              model={model}
              x={x}
              y={y}
              isMaster={model.id === masterId}
              isActive={model.id === currentActorId}
              isNext={model.id === nextActorId}
              stepType={model.id === currentActorId ? currentStepType : undefined}
              onClick={() => onModelClick(model.id)}
            />
          ))}
        </AnimatePresence>
      </svg>
    </div>
  );
}

function getCenterStatus(
  sessionStatus?: string,
  roundStatus?: string,
  stepType?: string
): { label: string; sublabel: string; color: string } {
  // Active step takes priority
  if (stepType) {
    const stepLabels: Record<string, string> = {
      master_topic: 'Selecting Topic',
      master_question: 'Creating Question',
      model_answer: 'Answering',
      model_judge: 'Judging',
      scoring: 'Calculating',
    };
    return {
      label: stepLabels[stepType] ?? 'Processing',
      sublabel: 'In progress...',
      color: 'var(--color-accent)',
    };
  }

  // Round status when no active step
  if (roundStatus) {
    const roundLabels: Record<string, { label: string; sublabel: string }> = {
      created: { label: 'Round Starting', sublabel: 'Preparing...' },
      topic_selection: { label: 'Topic Phase', sublabel: 'Awaiting selection' },
      question_creation: { label: 'Question Phase', sublabel: 'Awaiting question' },
      answering: { label: 'Answer Phase', sublabel: 'Models responding' },
      judging: { label: 'Judge Phase', sublabel: 'Peer evaluation' },
      scoring: { label: 'Scoring', sublabel: 'Tallying results' },
      completed: { label: 'Round Complete', sublabel: 'Next round soon' },
    };
    const info = roundLabels[roundStatus];
    if (info) {
      return { ...info, color: 'var(--color-text-secondary)' };
    }
  }

  // Session status when no round
  if (sessionStatus) {
    const sessionLabels: Record<string, { label: string; sublabel: string; color: string }> = {
      created: { label: 'Ready', sublabel: 'Awaiting start', color: 'var(--color-text-muted)' },
      running: { label: 'Running', sublabel: 'Game in progress', color: 'var(--color-success)' },
      paused: { label: 'Paused', sublabel: 'Waiting to resume', color: 'var(--color-warning)' },
      completed: { label: 'Finished', sublabel: 'Game over', color: 'var(--color-success)' },
    };
    return sessionLabels[sessionStatus] ?? { label: 'Unknown', sublabel: sessionStatus, color: 'var(--color-text-muted)' };
  }

  // No session
  return { label: 'No Game', sublabel: 'Start a session', color: 'var(--color-text-muted)' };
}
