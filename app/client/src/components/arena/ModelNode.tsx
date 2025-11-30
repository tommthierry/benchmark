// Individual model node in the arena circle
// Handles states: idle, thinking (active), answered, judging, judged
// With speech bubble for answer previews and next-to-answer indicator

import { motion } from 'framer-motion';
import { SpeechBubble } from './SpeechBubble';

interface ModelNodeProps {
  model: {
    id: string;
    displayName: string;
    status: 'idle' | 'thinking' | 'answered' | 'judging' | 'judged';
    answerPreview?: string; // First ~15 words of answer
  };
  x: number;
  y: number;
  isMaster: boolean;
  isActive: boolean;
  isNext?: boolean; // Is next to answer/judge
  stepType?: string;
  onClick: () => void;
}

export function ModelNode({
  model,
  x,
  y,
  isMaster,
  isActive,
  isNext = false,
  onClick,
}: ModelNodeProps) {
  const nodeRadius = 40;

  // Determine bubble position based on model position in circle
  // Top half of circle: bubble below; Bottom half: bubble above
  const bubblePosition = y < 300 ? 'bottom' : 'top';

  // Show bubble if model has answered (not while thinking)
  const showBubble = model.status === 'answered' && !!model.answerPreview;

  // Determine visual state
  const getNodeStyles = () => {
    if (isActive) {
      return {
        fill: 'var(--color-accent)',
        stroke: 'var(--color-accent)',
        strokeWidth: 3,
        filter: 'url(#glow)',
      };
    }
    if (model.status === 'answered' || model.status === 'judged') {
      return {
        fill: 'var(--color-bg-elevated)',
        stroke: 'var(--color-success)',
        strokeWidth: 2,
        filter: undefined,
      };
    }
    if (model.status === 'judging') {
      return {
        fill: 'var(--color-bg-tertiary)',
        stroke: 'var(--color-warning)',
        strokeWidth: 2,
        filter: undefined,
      };
    }
    return {
      fill: 'var(--color-bg-tertiary)',
      stroke: 'var(--color-bg-elevated)',
      strokeWidth: 2,
      filter: undefined,
    };
  };

  const styles = getNodeStyles();

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    >
      {/* Speech bubble (positioned outside SVG space using foreignObject) */}
      {showBubble && (
        <foreignObject
          x={x - 100}
          y={bubblePosition === 'top' ? y - nodeRadius - 70 : y + nodeRadius + 10}
          width={200}
          height={70}
          style={{ overflow: 'visible' }}
        >
          <div className="flex justify-center">
            <SpeechBubble
              text={model.answerPreview!}
              position={bubblePosition}
              isVisible={true}
              maxWidth={180}
            />
          </div>
        </foreignObject>
      )}

      {/* Next-to-answer indicator ring */}
      {isNext && !isActive && (
        <motion.circle
          cx={x}
          cy={y}
          r={nodeRadius + 8}
          fill="none"
          stroke="var(--color-next-ring)"
          strokeWidth="2"
          strokeDasharray="4 4"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0.4, 1, 0.4],
            strokeDashoffset: [0, -16, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}

      {/* Enhanced thinking animation */}
      {isActive && (
        <>
          {/* Outer rotating ring */}
          <motion.circle
            cx={x}
            cy={y}
            r={nodeRadius + 12}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeDasharray="15 10"
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          />
          {/* Inner pulsing glow */}
          <motion.circle
            cx={x}
            cy={y}
            r={nodeRadius + 4}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1"
            initial={{ scale: 1, opacity: 0.3 }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          />
        </>
      )}

      {/* Master indicator ring */}
      {isMaster && !isActive && (
        <circle
          cx={x}
          cy={y}
          r={nodeRadius + 6}
          fill="none"
          stroke="var(--color-master)"
          strokeWidth="2"
          opacity="0.6"
        />
      )}

      {/* Main node circle */}
      <circle
        cx={x}
        cy={y}
        r={nodeRadius}
        fill={styles.fill}
        stroke={styles.stroke}
        strokeWidth={styles.strokeWidth}
        filter={styles.filter}
      />

      {/* Model name - truncated and centered */}
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fill="var(--color-text-primary)"
        fontSize="11"
        fontWeight="500"
        fontFamily="inherit"
        style={{ pointerEvents: 'none' }}
      >
        {truncateName(model.displayName, 9)}
      </text>

      {/* Thinking dots indicator */}
      {isActive && model.status === 'thinking' && (
        <g transform={`translate(${x - 12}, ${y + 16})`}>
          {[0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              cx={i * 8}
              cy={0}
              r={2}
              fill="var(--color-accent)"
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </g>
      )}

      {/* Master crown indicator */}
      {isMaster && (
        <g transform={`translate(${x}, ${y - nodeRadius - 12})`}>
          {/* Simple crown shape */}
          <path
            d="M-8,6 L-8,0 L-4,-5 L0,-2 L4,-5 L8,0 L8,6 Z"
            fill="var(--color-master)"
            stroke="var(--color-bg-primary)"
            strokeWidth="1"
          />
        </g>
      )}

      {/* Status indicator dot */}
      <circle
        cx={x + nodeRadius - 8}
        cy={y - nodeRadius + 8}
        r={6}
        fill={getStatusColor(model.status, isActive)}
        stroke="var(--color-bg-primary)"
        strokeWidth="2"
      />
    </motion.g>
  );
}

function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 1) + '…';
}

function getStatusColor(status: string, isActive: boolean): string {
  if (isActive) return 'var(--color-accent)';
  switch (status) {
    case 'thinking':
      return 'var(--color-accent)';
    case 'answered':
      return 'var(--color-success)';
    case 'judging':
      return 'var(--color-warning)';
    case 'judged':
      return 'var(--color-success)';
    default:
      return 'var(--color-text-muted)';
  }
}
