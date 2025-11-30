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
  onModelClick: (id: string) => void;
}

export function ArenaCircle({
  models,
  masterId,
  currentActorId,
  nextActorId,
  currentStepType,
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
        <text
          x="300"
          y="295"
          textAnchor="middle"
          fill="var(--color-text-secondary)"
          fontSize="13"
          fontFamily="inherit"
          fontWeight="500"
        >
          {getStepLabel(currentStepType)}
        </text>
        <text
          x="300"
          y="315"
          textAnchor="middle"
          fill="var(--color-text-muted)"
          fontSize="11"
          fontFamily="inherit"
        >
          {models.length} models
        </text>

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

function getStepLabel(stepType?: string): string {
  switch (stepType) {
    case 'master_topic':
      return 'Selecting Topic';
    case 'master_question':
      return 'Creating Question';
    case 'model_answer':
      return 'Answering';
    case 'model_judge':
      return 'Judging';
    case 'scoring':
      return 'Scoring';
    default:
      return 'Waiting';
  }
}
