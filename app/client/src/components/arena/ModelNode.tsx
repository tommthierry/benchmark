// Individual model node in the arena circle
// Handles states: idle, thinking (active), answered, judging, judged

import { motion } from 'framer-motion';

interface ModelNodeProps {
  model: {
    id: string;
    displayName: string;
    status: 'idle' | 'thinking' | 'answered' | 'judging' | 'judged';
  };
  x: number;
  y: number;
  isMaster: boolean;
  isActive: boolean;
  stepType?: string;
  onClick: () => void;
}

export function ModelNode({
  model,
  x,
  y,
  isMaster,
  isActive,
  onClick,
}: ModelNodeProps) {
  const nodeRadius = 40;

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
      {/* Thinking animation ring */}
      {isActive && (
        <motion.circle
          cx={x}
          cy={y}
          r={nodeRadius + 10}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeDasharray="10 5"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
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
