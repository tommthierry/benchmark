# Phase 2: Round Completion UX

## Objective

Create an engaging round completion experience with:
- Animated leaderboard overlay showing round results
- Score change animations
- Question recap with winner highlight
- Smooth transition back to next round

## Prerequisites

- Phase 0 completed (admin game control)
- Phase 1 completed (speech bubbles, thinking states)
- Read `MASTER_PLAN.md` for context

## Progress Tracker

| Step | Task | Status |
|------|------|--------|
| 2.1 | Create RoundCompleteOverlay component | ✅ |
| 2.2 | Create LeaderboardRow component | ✅ |
| 2.3 | Add overlay animations | ✅ |
| 2.4 | Integrate with ArenaPage | ✅ |
| 2.5 | Add auto-dismiss logic | ✅ |
| 2.6 | Polish and testing | ✅ |

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `app/client/src/components/arena/RoundCompleteOverlay.tsx` | CREATE | Overlay with leaderboard |
| `app/client/src/components/arena/LeaderboardRow.tsx` | CREATE | Animated row component |
| `app/client/src/pages/ArenaPage.tsx` | MODIFY | Integrate overlay |

---

## Step 2.1: Create RoundCompleteOverlay Component

Create the main overlay container.

**File:** `app/client/src/components/arena/RoundCompleteOverlay.tsx`

```tsx
// Round completion overlay with animated leaderboard
// Shows after scoring step completes

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, ChevronRight } from 'lucide-react';
import { LeaderboardRow } from './LeaderboardRow';

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
                {question}
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
            <div className="px-6 py-4 bg-[var(--color-bg-tertiary)]/50">
              <button
                onClick={onNextRound ?? onClose}
                className="w-full py-3 px-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90
                           rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                Continue
                <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Verification:**
- [ ] Overlay renders with backdrop
- [ ] Modal centers properly
- [ ] Close button works
- [ ] Winner highlighted in header

---

## Step 2.2: Create LeaderboardRow Component

Animated row for each model's score.

**File:** `app/client/src/components/arena/LeaderboardRow.tsx`

```tsx
// Animated leaderboard row with rank, name, and score
// Staggered animation for dramatic reveal

import { motion } from 'framer-motion';
import { Crown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { RoundScore } from './RoundCompleteOverlay';

interface LeaderboardRowProps {
  score: RoundScore;
  index: number;
  isWinner: boolean;
}

export function LeaderboardRow({ score, index, isWinner }: LeaderboardRowProps) {
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
```

**Verification:**
- [ ] Rows animate in sequence
- [ ] Winner row is highlighted
- [ ] Score badge animates with pop effect
- [ ] Rank change shows correctly

---

## Step 2.3: Add Overlay Animations

Enhance animations for a more polished feel.

**File:** Update `RoundCompleteOverlay.tsx`

Add confetti/celebration effect for winner (optional but nice):

```tsx
// Add to imports
import { useEffect, useState } from 'react';

// Add inside component before return
const [showConfetti, setShowConfetti] = useState(false);

useEffect(() => {
  if (isVisible) {
    // Trigger confetti after modal appears
    const timer = setTimeout(() => setShowConfetti(true), 500);
    return () => clearTimeout(timer);
  } else {
    setShowConfetti(false);
  }
}, [isVisible]);
```

Add simple particle effect in header area:

```tsx
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
```

**Verification:**
- [ ] Particles animate upward from center
- [ ] Animation doesn't lag or stutter
- [ ] Effect is subtle, not overwhelming

---

## Step 2.4: Integrate with ArenaPage

Connect the overlay to the arena page state.

**File:** `app/client/src/pages/ArenaPage.tsx`

Add state for overlay:

```tsx
const [showRoundComplete, setShowRoundComplete] = useState(false);
const [roundCompleteData, setRoundCompleteData] = useState<{
  roundNumber: number;
  question: string;
  topic?: string;
  masterName?: string;
  scores: RoundScore[];
} | null>(null);
```

Import the overlay and types:

```tsx
import { RoundCompleteOverlay, type RoundScore } from '../components/arena/RoundCompleteOverlay';
```

Update `handleRoundCompleted` callback:

```tsx
const handleRoundCompleted = useCallback((data: RoundCompletedEvent) => {
  // Build scores array from the event data
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

  // Set data for overlay
  setRoundCompleteData({
    roundNumber: data.roundNumber,
    question: arenaState?.questionContent ?? '',
    topic: arenaState?.topicName ?? undefined,
    masterName: arenaState?.masterName ?? undefined,
    scores: sortedScores,
  });

  // Show overlay
  setShowRoundComplete(true);

  // Update arena state
  setArenaState((prev) => prev ? {
    ...prev,
    completedRounds: data.roundNumber,
    models: prev.models.map((m) => ({ ...m, status: 'idle' as const, hasAnswered: false, hasJudged: false })),
    answerPreviews: {}, // Clear previews for next round
    roundStatus: 'completed',
    questionContent: null,
    topicName: null,
    currentRoundId: null,
    nextActorId: null,
  } : null);

  addActivity({
    type: 'score',
    message: `Round ${data.roundNumber} complete!`,
  });
}, [arenaState, addActivity]);
```

Add overlay to render:

```tsx
// Add after ModelDetailModal at end of component
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
```

**Verification:**
- [ ] Overlay shows when round completes
- [ ] Scores display correctly
- [ ] Clicking "Continue" closes overlay
- [ ] Next round starts cleanly

---

## Step 2.5: Add Auto-Dismiss Logic

Auto-close the overlay after a set time if user doesn't interact.

**File:** `app/client/src/components/arena/RoundCompleteOverlay.tsx`

Add auto-dismiss effect:

```tsx
import { useEffect } from 'react';

// Inside the component
useEffect(() => {
  if (!isVisible) return;

  // Auto-dismiss after 15 seconds
  const timer = setTimeout(() => {
    onClose();
  }, 15000);

  return () => clearTimeout(timer);
}, [isVisible, onClose]);
```

Add a visual countdown indicator (optional):

```tsx
// Add after the Continue button in footer
<motion.div
  className="absolute bottom-0 left-0 h-1 bg-[var(--color-accent)]/30"
  initial={{ width: '100%' }}
  animate={{ width: '0%' }}
  transition={{ duration: 15, ease: 'linear' }}
/>
```

**Verification:**
- [ ] Overlay auto-closes after 15 seconds
- [ ] Progress bar shows countdown
- [ ] Manual close resets correctly

---

## Step 2.6: Polish and Testing

Final polish and comprehensive testing.

**Test Scenarios:**

1. **Single Round Completion:**
   - [ ] Start session with 1 round
   - [ ] Complete all steps
   - [ ] Verify overlay shows with correct data
   - [ ] Click Continue
   - [ ] Verify session shows as complete

2. **Multi-Round Session:**
   - [ ] Start session with 3 rounds
   - [ ] Complete round 1
   - [ ] Verify overlay shows
   - [ ] Close overlay
   - [ ] Start round 2
   - [ ] Verify models reset to idle

3. **Score Accuracy:**
   - [ ] Verify scores match what backend returns
   - [ ] Verify ranking order is correct
   - [ ] Verify winner is highlighted

4. **Animation Quality:**
   - [ ] Overlay entrance is smooth
   - [ ] Row stagger animation looks good
   - [ ] Score pop animation is satisfying
   - [ ] Confetti is subtle

5. **Edge Cases:**
   - [ ] Very long model names truncate
   - [ ] Very long question truncates
   - [ ] Overlay scrolls if many models
   - [ ] Works on mobile viewport

**Polish Tasks:**
- [ ] Ensure consistent spacing
- [ ] Check color contrast for accessibility
- [ ] Verify touch targets are large enough
- [ ] Test with screen reader (basic)

---

## Final Checklist

Before marking Phase 2 complete:

- [ ] All steps in Progress Tracker are ✅
- [ ] No TypeScript compilation errors
- [ ] Overlay renders correctly on all viewports
- [ ] Animations run at 60fps
- [ ] Auto-dismiss works correctly
- [ ] Scores are accurate

---

## Summary

After completing all three phases, the AI Arena should have:

1. **Admin Game Page (`/admin/game`):**
   - Full state visibility
   - Manual step execution
   - Session controls

2. **Public Arena Page (`/arena`):**
   - Clear empty state
   - Speech bubbles with answer previews
   - Thinking animations
   - Next-to-answer indicators
   - Round completion overlay

3. **Polished UX:**
   - Smooth animations throughout
   - Clear visual hierarchy
   - Responsive design
   - Accessible interactions

**Congratulations!** The AI Arena enhancement is complete.
