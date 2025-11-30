// Round completion overlay with animated leaderboard
// Shows after scoring step completes

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, ChevronRight, Crown, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface RoundScore {
  modelId: string;
  modelName: string;
  score: number;
  rank: number;
  previousRank?: number;
  isMaster?: boolean;
}

interface RoundCompleteOverlayProps {
  /** Whether overlay is visible */
  isVisible: boolean;
  /** Round number that completed */
  roundNumber: number;
  /** The question that was asked */
  question: string;
  /** Topic category */
  topic?: string;
  /** Master model name */
  masterName?: string;
  /** Scores sorted by rank */
  scores: RoundScore[];
  /** Callback when overlay should close */
  onClose: () => void;
  /** Callback when "Next Round" is clicked */
  onNextRound?: () => void;
}

export function RoundCompleteOverlay({
  isVisible,
  roundNumber,
  question,
  topic,
  masterName,
  scores,
  onClose,
  onNextRound,
}: RoundCompleteOverlayProps) {
  const winner = scores[0];
  const [showConfetti, setShowConfetti] = useState(false);

  // Auto-dismiss after 15 seconds
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      onClose();
    }, 15000);

    return () => clearTimeout(timer);
  }, [isVisible, onClose]);

  // Trigger confetti after modal appears
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShowConfetti(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowConfetti(false);
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-[var(--color-bg-secondary)] rounded-xl w-full max-w-md
                       shadow-2xl border border-[var(--color-bg-tertiary)] overflow-hidden"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-[var(--color-accent)]/20 to-transparent p-6">
              {/* Celebration particles */}
              {showConfetti && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{
                        x: '50%',
                        y: '50%',
                        scale: 0,
                      }}
                      animate={{
                        x: `${25 + Math.random() * 50}%`,
                        y: `${-20 - Math.random() * 30}%`,
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        delay: i * 0.05,
                        ease: 'easeOut',
                      }}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: ['var(--color-accent)', 'var(--color-success)', 'var(--color-warning)'][i % 3],
                      }}
                    />
                  ))}
                </div>
              )}

              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={18} className="text-[var(--color-text-muted)]" />
              </button>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-12 h-12 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center mb-3"
              >
                <Trophy className="text-[var(--color-accent)]" size={24} />
              </motion.div>

              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                Round {roundNumber} Complete!
              </h2>

              {winner && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm text-[var(--color-text-secondary)] mt-1"
                >
                  Winner: <span className="text-[var(--color-accent)] font-medium">{winner.modelName}</span>
                </motion.p>
              )}
            </div>

            {/* Question Recap */}
            <div className="px-6 py-4 border-b border-[var(--color-bg-tertiary)]">
              {topic && (
                <div className="text-xs text-[var(--color-text-muted)] mb-1">{topic}</div>
              )}
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed line-clamp-3">
                {question || 'No question available'}
              </p>
              {masterName && (
                <div className="text-xs text-[var(--color-text-muted)] mt-2">
                  Asked by {masterName}
                </div>
              )}
            </div>

            {/* Leaderboard */}
            <div className="px-6 py-4 max-h-64 overflow-y-auto">
              <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                Rankings
              </h3>
              <div className="space-y-2">
                {scores.map((score, index) => (
                  <LeaderboardRow
                    key={score.modelId}
                    score={score}
                    index={index}
                    isWinner={index === 0}
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="relative px-6 py-4 bg-[var(--color-bg-tertiary)]/50">
              <button
                onClick={onNextRound ?? onClose}
                className="w-full py-3 px-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90
                           rounded-lg font-medium transition-colors flex items-center justify-center gap-2
                           text-white"
              >
                Continue
                <ChevronRight size={18} />
              </button>

              {/* Auto-dismiss progress bar */}
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-[var(--color-accent)]/30"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 15, ease: 'linear' }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Leaderboard Row Component
function LeaderboardRow({
  score,
  index,
  isWinner
}: {
  score: RoundScore;
  index: number;
  isWinner: boolean;
}) {
  // Calculate rank change
  const rankChange = score.previousRank
    ? score.previousRank - score.rank
    : 0;

  const getRankChangeIcon = () => {
    if (rankChange > 0) {
      return <TrendingUp size={12} className="text-green-400" />;
    }
    if (rankChange < 0) {
      return <TrendingDown size={12} className="text-red-400" />;
    }
    return <Minus size={12} className="text-gray-500" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={`flex items-center justify-between p-3 rounded-lg ${
        isWinner
          ? 'bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30'
          : 'bg-[var(--color-bg-tertiary)]/50'
      }`}
    >
      {/* Left side - Rank + Name */}
      <div className="flex items-center gap-3">
        {/* Rank badge */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            isWinner
              ? 'bg-[var(--color-accent)] text-white'
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
          }`}
        >
          {score.rank}
        </div>

        {/* Model name */}
        <div className="flex items-center gap-2">
          <span
            className={`font-medium ${
              isWinner ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'
            }`}
          >
            {score.modelName}
          </span>
          {score.isMaster && (
            <Crown size={12} className="text-yellow-500" />
          )}
        </div>
      </div>

      {/* Right side - Score + Change */}
      <div className="flex items-center gap-3">
        {/* Rank change indicator */}
        {score.previousRank !== undefined && (
          <div className="flex items-center gap-1">
            {getRankChangeIcon()}
            {rankChange !== 0 && (
              <span className={`text-xs ${rankChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {Math.abs(rankChange)}
              </span>
            )}
          </div>
        )}

        {/* Score */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.1 + 0.2, type: 'spring' }}
          className={`px-3 py-1 rounded-full text-sm font-bold ${
            isWinner
              ? 'bg-[var(--color-accent)] text-white'
              : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]'
          }`}
        >
          {score.score.toFixed(1)}
        </motion.div>
      </div>
    </motion.div>
  );
}
