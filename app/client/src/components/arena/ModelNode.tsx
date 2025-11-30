// Individual model node in the arena circle
// Minimal design: name tag with status dots row, two-line name

import { motion } from 'framer-motion';
import { SpeechBubble } from './SpeechBubble';

interface ModelNodeProps {
  model: {
    id: string;
    displayName: string;
    status: 'idle' | 'thinking' | 'answered' | 'judging' | 'judged';
    hasAnswered?: boolean;
    hasJudged?: boolean;
    answerPreview?: string;
  };
  x: number;
  y: number;
  color: string;
  index: number;
  isMaster: boolean;
  isActive: boolean;
  isNext?: boolean;
  roundPhase?: 'answering' | 'judging' | null;
  onClick: () => void;
}

export function ModelNode({
  model,
  x,
  y,
  color,
  isMaster,
  isActive,
  isNext = false,
  roundPhase,
  onClick,
}: ModelNodeProps) {
  const nameTagWidth = 130;
  const nameTagHeight = 56; // Taller for dots row + two text lines
  const tagY = y;

  // Determine bubble position based on model position in circle
  const bubblePosition = y < 300 ? 'bottom' : 'top';

  // Show bubble ONLY during answering phase (not during judging)
  // Also, master never shows a bubble since they don't answer
  const showBubble =
    !isMaster &&
    roundPhase === 'answering' &&
    model.status === 'answered' &&
    !!model.answerPreview;

  // Status dot states
  const hasAnswered = model.hasAnswered || model.status === 'answered';
  const hasJudged = model.hasJudged || model.status === 'judged';

  // Split name into two lines
  const { line1, line2 } = splitName(model.displayName, 14);

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    >
      {/* Speech bubble */}
      {showBubble && (
        <foreignObject
          x={x - 100}
          y={bubblePosition === 'top' ? tagY - 90 : tagY + nameTagHeight + 25}
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

      {/* Next-to-act rotating indicator around name tag - subtle gray */}
      {isNext && !isActive && (
        <motion.rect
          x={x - nameTagWidth / 2 - 6}
          y={tagY - 6}
          width={nameTagWidth + 12}
          height={nameTagHeight + 12}
          rx={14}
          fill="none"
          stroke="var(--color-text-tertiary)"
          strokeWidth="1.5"
          strokeDasharray="6 8"
          opacity={0.5}
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: -28 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Active animation around name tag */}
      {isActive && (
        <>
          {/* Outer animated border */}
          <motion.rect
            x={x - nameTagWidth / 2 - 8}
            y={tagY - 8}
            width={nameTagWidth + 16}
            height={nameTagHeight + 16}
            rx={16}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeDasharray="10 6"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -32 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
          {/* Pulsing glow */}
          <motion.rect
            x={x - nameTagWidth / 2 - 4}
            y={tagY - 4}
            width={nameTagWidth + 8}
            height={nameTagHeight + 8}
            rx={12}
            fill="none"
            stroke={color}
            strokeWidth="2"
            initial={{ opacity: 0.3 }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            filter="url(#glow)"
          />
        </>
      )}

      {/* Master crown - above name tag, same width */}
      {isMaster && (
        <g transform={`translate(${x}, ${tagY - 22})`}>
          <g transform="scale(3.2, 1.8)">
            <rect x={-10} y={4} width={20} height={3} rx={1} fill="var(--color-master)" stroke="var(--color-bg-primary)" strokeWidth="0.3" />
            <path d="M-10,4 L-10,1 L-7,-4 L-4,0 L0,-6 L4,0 L7,-4 L10,1 L10,4 Z" fill="var(--color-master)" stroke="var(--color-bg-primary)" strokeWidth="0.3" />
            <circle cx={0} cy={-4} r={1.5} fill="#fff" stroke="var(--color-master)" strokeWidth="0.3" />
            <circle cx={-6} cy={-2.5} r={1} fill="#fff" opacity="0.8" />
            <circle cx={6} cy={-2.5} r={1} fill="#fff" opacity="0.8" />
          </g>
        </g>
      )}

      {/* Name tag */}
      <g transform={`translate(${x}, ${tagY})`}>
        {/* Background rounded rect */}
        <rect
          x={-nameTagWidth / 2}
          y={0}
          width={nameTagWidth}
          height={nameTagHeight}
          rx={10}
          fill="var(--color-bg-elevated)"
          stroke={color}
          strokeWidth="2"
          opacity={model.status === 'idle' && !isActive && !isNext ? 0.7 : 1}
        />

        {/* Row 1: Status dots centered - hidden when thinking/judging */}
        <g transform={`translate(0, 10)`}>
          {/* Status dots only shown when NOT actively thinking/judging */}
          {!(isActive && (model.status === 'thinking' || model.status === 'judging')) && (
            <>
              {/* Answer status dot */}
              <circle
                cx={-10}
                cy={0}
                r={5}
                fill={hasAnswered ? 'var(--color-success)' : 'var(--color-bg-tertiary)'}
                stroke="var(--color-bg-primary)"
                strokeWidth="1.5"
              />
              {/* Judge status dot */}
              <circle
                cx={10}
                cy={0}
                r={5}
                fill={hasJudged ? 'var(--color-success)' : 'var(--color-bg-tertiary)'}
                stroke="var(--color-bg-primary)"
                strokeWidth="1.5"
              />
            </>
          )}

          {/* Thinking/Judging dots - replace status dots when active */}
          {isActive && (model.status === 'thinking' || model.status === 'judging') && (
            <>
              {[0, 1, 2].map((i) => (
                <motion.circle
                  key={i}
                  cx={-14 + i * 14}
                  cy={0}
                  r={5}
                  fill={model.status === 'judging' ? 'var(--color-warning)' : color}
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    scale: [0.8, 1.3, 0.8],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </>
          )}
        </g>

        {/* Name text - vertically centered in remaining space */}
        {line2 ? (
          <>
            {/* Two lines */}
            <text
              x={0}
              y={33}
              textAnchor="middle"
              fill="var(--color-text-primary)"
              fontSize="15"
              fontWeight="600"
              fontFamily="inherit"
              style={{ pointerEvents: 'none' }}
            >
              {line1}
            </text>
            <text
              x={0}
              y={50}
              textAnchor="middle"
              fill="var(--color-text-secondary)"
              fontSize="14"
              fontWeight="500"
              fontFamily="inherit"
              style={{ pointerEvents: 'none' }}
            >
              {line2}
            </text>
          </>
        ) : (
          /* Single line - vertically centered */
          <text
            x={0}
            y={42}
            textAnchor="middle"
            fill="var(--color-text-primary)"
            fontSize="15"
            fontWeight="600"
            fontFamily="inherit"
            style={{ pointerEvents: 'none' }}
          >
            {line1}
          </text>
        )}
      </g>
    </motion.g>
  );
}

function splitName(name: string, maxCharsPerLine: number): { line1: string; line2: string } {
  // If name fits on one line, just use it
  if (name.length <= maxCharsPerLine) {
    return { line1: name, line2: '' };
  }

  // Try to split at a natural break point (space, /, -)
  const breakChars = [' ', '/', '-'];
  let splitIndex = -1;

  // Look for break point near middle but within first line limit
  for (let i = Math.min(maxCharsPerLine, name.length - 1); i > 0; i--) {
    if (breakChars.includes(name[i])) {
      splitIndex = i;
      break;
    }
  }

  // If no natural break, just split at max
  if (splitIndex === -1) {
    splitIndex = maxCharsPerLine;
  }

  const line1 = name.slice(0, splitIndex).trim();
  let line2 = name.slice(splitIndex).trim();

  // Truncate line2 if too long
  if (line2.length > maxCharsPerLine) {
    line2 = line2.slice(0, maxCharsPerLine - 3) + '...';
  }

  return { line1, line2 };
}
