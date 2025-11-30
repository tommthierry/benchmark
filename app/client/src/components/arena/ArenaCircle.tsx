// Circular arena layout using SVG
// Models arranged in a circle with color-coded identification

import { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ModelNode } from './ModelNode';
import { getModelColorByIndex } from '../../lib/modelColors';

interface Model {
  id: string;
  displayName: string;
  status: 'idle' | 'thinking' | 'answered' | 'judging' | 'judged';
  hasAnswered?: boolean;
  hasJudged?: boolean;
  answerPreview?: string;
}

interface ArenaCircleProps {
  models: Model[];
  masterId?: string;
  currentActorId?: string;
  nextActorId?: string;
  roundPhase?: 'answering' | 'judging' | null;
  onModelClick: (id: string) => void;
}

export function ArenaCircle({
  models,
  masterId,
  currentActorId,
  nextActorId,
  roundPhase,
  onModelClick,
}: ArenaCircleProps) {
  // Calculate positions and assign colors
  const { positions, viewBox } = useMemo(() => {
    const count = models.length;
    const centerX = 300;
    const centerY = 300;
    // Adjust radius based on model count
    const baseRadius = count <= 4 ? 160 : count <= 8 ? 180 : 200;
    const vb = '0 0 600 600';

    const pos = models.map((model, index) => {
      // Start from top (-90deg) and go clockwise
      const angle = ((2 * Math.PI) / count) * index - Math.PI / 2;
      return {
        model,
        x: centerX + baseRadius * Math.cos(angle),
        y: centerY + baseRadius * Math.sin(angle),
        color: getModelColorByIndex(index),
        index,
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
        {/* Defs for filters */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Subtle connecting lines between nodes */}
        <g opacity="0.06">
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

        {/* Model nodes */}
        <AnimatePresence mode="sync">
          {positions.map(({ model, x, y, color, index }) => (
            <ModelNode
              key={model.id}
              model={model}
              x={x}
              y={y}
              color={color}
              index={index}
              isMaster={model.id === masterId}
              isActive={model.id === currentActorId}
              isNext={model.id === nextActorId}
              roundPhase={roundPhase}
              onClick={() => onModelClick(model.id)}
            />
          ))}
        </AnimatePresence>
      </svg>
    </div>
  );
}
