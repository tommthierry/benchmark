# Phase 1: Arena UI Enhancements

## Objective

Enhance the public `/arena` page with:
- Speech bubbles showing model response previews
- Clear "thinking" animation when model is processing
- "Next to answer" indicator for upcoming model
- Improved empty state when no game running
- Better model state visualization

## Prerequisites

- Phase 0 completed (admin game control working)
- Read `MASTER_PLAN.md` for context
- Existing components: `ArenaCircle.tsx`, `ModelNode.tsx`, `ArenaPage.tsx`

## Progress Tracker

| Step | Task | Status |
|------|------|--------|
| 1.1 | Create SpeechBubble component | ✅ |
| 1.2 | Add CSS variables for bubbles | ✅ |
| 1.3 | Enhance ModelNode with bubble support | ✅ |
| 1.4 | Add "next to answer" indicator | ✅ |
| 1.5 | Improve empty state | ✅ |
| 1.6 | Update ArenaPage state handling | ✅ |
| 1.7 | Add thinking animation polish | ✅ |
| 1.8 | Integration testing | ✅ |

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `app/client/src/components/arena/SpeechBubble.tsx` | CREATE | Speech bubble component |
| `app/client/src/styles/design-tokens.css` | MODIFY | Add bubble CSS variables |
| `app/client/src/components/arena/ModelNode.tsx` | MODIFY | Add bubble + next indicator |
| `app/client/src/components/arena/ArenaCircle.tsx` | MODIFY | Pass answer preview data |
| `app/client/src/pages/ArenaPage.tsx` | MODIFY | Track answer previews, improve states |

---

## Step 1.1: Create SpeechBubble Component

Create a simple, elegant speech bubble using CSS pseudo-elements.

**File:** `app/client/src/components/arena/SpeechBubble.tsx`

```tsx
// Speech bubble for showing answer previews
// Pure CSS approach with tail pointing toward model

import { motion, AnimatePresence } from 'framer-motion';

interface SpeechBubbleProps {
  /** The text to display (first ~15 words recommended) */
  text: string;
  /** Position relative to model node */
  position: 'top' | 'bottom' | 'left' | 'right';
  /** Whether bubble is visible */
  isVisible: boolean;
  /** Optional max width in pixels */
  maxWidth?: number;
}

export function SpeechBubble({
  text,
  position = 'top',
  isVisible,
  maxWidth = 200,
}: SpeechBubbleProps) {
  // Position classes for tail direction
  const positionStyles: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-3',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-3',
    left: 'right-full top-1/2 -translate-y-1/2 mr-3',
    right: 'left-full top-1/2 -translate-y-1/2 ml-3',
  };

  // Tail position (opposite of bubble position)
  const tailStyles: Record<string, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[var(--color-bubble-bg)] border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[var(--color-bubble-bg)] border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[var(--color-bubble-bg)] border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[var(--color-bubble-bg)] border-y-transparent border-l-transparent',
  };

  return (
    <AnimatePresence>
      {isVisible && text && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          className={`absolute z-10 ${positionStyles[position]}`}
          style={{ maxWidth }}
        >
          {/* Bubble body */}
          <div className="relative bg-[var(--color-bubble-bg)] text-[var(--color-bubble-text)]
                          px-3 py-2 rounded-lg shadow-lg text-xs leading-relaxed">
            {truncateText(text, 60)}

            {/* Tail (arrow) using border trick */}
            <div
              className={`absolute w-0 h-0 border-[6px] ${tailStyles[position]}`}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Truncate text to approximately N characters, breaking at word boundary
 */
function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxChars * 0.7) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Get first N words from text
 */
export function getPreviewWords(text: string, wordCount: number = 15): string {
  const words = text.split(/\s+/).slice(0, wordCount);
  return words.join(' ') + (text.split(/\s+/).length > wordCount ? '...' : '');
}
```

**Verification:**
- [ ] Component renders bubble with text
- [ ] Tail points in correct direction
- [ ] Animation on show/hide works
- [ ] Text truncates properly

---

## Step 1.2: Add CSS Variables for Bubbles

**File:** `app/client/src/styles/design-tokens.css`

Add these variables to the existing CSS file (in the `:root` section):

```css
/* Speech Bubble Colors */
--color-bubble-bg: #374151;
--color-bubble-text: #f3f4f6;
--color-bubble-bg-master: #854d0e;
--color-bubble-text-master: #fef3c7;

/* Next-to-answer indicator */
--color-next-ring: #60a5fa;
--color-next-ring-glow: rgba(96, 165, 250, 0.3);
```

If the file doesn't have dark mode variants, add them inside a `@media (prefers-color-scheme: dark)` or keep the existing dark theme approach.

**Verification:**
- [ ] Variables are accessible from components
- [ ] Bubble colors look good against arena background

---

## Step 1.3: Enhance ModelNode with Bubble Support

Modify `app/client/src/components/arena/ModelNode.tsx` to:
1. Accept answer preview text as prop
2. Show speech bubble when model has answered
3. Position bubble intelligently based on model position

**File:** `app/client/src/components/arena/ModelNode.tsx`

Update the props interface:

```tsx
interface ModelNodeProps {
  model: {
    id: string;
    displayName: string;
    status: 'idle' | 'thinking' | 'answered' | 'judging' | 'judged';
    answerPreview?: string; // NEW: First ~15 words of answer
  };
  x: number;
  y: number;
  isMaster: boolean;
  isActive: boolean;
  isNext?: boolean; // NEW: Is next to answer/judge
  stepType?: string;
  onClick: () => void;
}
```

Import and integrate the SpeechBubble:

```tsx
import { SpeechBubble, getPreviewWords } from './SpeechBubble';
```

In the component body, add bubble logic:

```tsx
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

  // ... existing getNodeStyles code ...

  return (
    <motion.g
      // ... existing motion props ...
    >
      {/* Speech bubble (positioned outside SVG space using foreignObject) */}
      {showBubble && (
        <foreignObject
          x={x - 100}
          y={bubblePosition === 'top' ? y - nodeRadius - 80 : y + nodeRadius + 10}
          width={200}
          height={80}
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

      {/* ... rest of existing code (thinking ring, master ring, main circle, etc.) ... */}
    </motion.g>
  );
}
```

**Verification:**
- [ ] Bubble appears when model status is "answered"
- [ ] Bubble position adapts to model location
- [ ] "Next" indicator ring shows for upcoming model
- [ ] No visual conflicts with existing elements

---

## Step 1.4: Add "Next to Answer" Indicator

Update `ArenaCircle.tsx` to pass `isNext` prop to `ModelNode`:

**File:** `app/client/src/components/arena/ArenaCircle.tsx`

Update the props:

```tsx
interface ArenaCircleProps {
  models: Array<{
    id: string;
    displayName: string;
    status: 'idle' | 'thinking' | 'answered' | 'judging' | 'judged';
    hasAnswered?: boolean;
    hasJudged?: boolean;
    answerPreview?: string; // NEW
  }>;
  masterId?: string;
  currentActorId?: string;
  nextActorId?: string; // NEW: ID of model that will act next
  currentStepType?: string;
  onModelClick: (id: string) => void;
}
```

In the render, pass `isNext`:

```tsx
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
```

**Verification:**
- [ ] Next model has dashed ring indicator
- [ ] Indicator animates smoothly
- [ ] Indicator disappears when model becomes active

---

## Step 1.5: Improve Empty State

Update `ArenaPage.tsx` to have a more informative empty state.

**File:** `app/client/src/pages/ArenaPage.tsx`

Replace `ArenaEmptyState` function:

```tsx
function ArenaEmptyState({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
      <div className="text-center max-w-lg px-6">
        {/* Animated icon */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          {/* Outer ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-[var(--color-bg-tertiary)]"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          {/* Inner circle */}
          <div className="absolute inset-4 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center">
            {isConnected ? (
              <Wifi className="w-8 h-8 text-[var(--color-text-muted)]" />
            ) : (
              <WifiOff className="w-8 h-8 text-[var(--color-text-muted)]" />
            )}
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-3">
          {isConnected ? 'Arena Ready' : 'Connecting...'}
        </h2>

        <p className="text-[var(--color-text-secondary)] mb-4">
          {isConnected
            ? 'The arena is waiting for a game session to begin. Once started, AI models will compete in real-time.'
            : 'Attempting to connect to the arena server...'}
        </p>

        <div className="text-xs text-[var(--color-text-muted)]">
          {isConnected ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
              Connected and listening
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
```

Don't forget to import `motion` from framer-motion if not already imported.

**Verification:**
- [ ] Empty state shows when no session
- [ ] Animation runs smoothly
- [ ] Connection status is clear

---

## Step 1.6: Update ArenaPage State Handling

Enhance `ArenaPage.tsx` to:
1. Track answer previews per model
2. Determine next actor
3. Pass enhanced data to components

**File:** `app/client/src/pages/ArenaPage.tsx`

Update the `ArenaDisplayState` interface:

```tsx
interface ArenaDisplayState {
  sessionId: string | null;
  sessionStatus: string | null;
  totalRounds: number;
  completedRounds: number;
  currentRoundId: string | null;
  roundNumber: number | null;
  roundStatus: string | null; // NEW
  masterId: string | null;
  masterName: string | null;
  topicName: string | null;
  questionContent: string | null;
  currentStepType: string | null;
  currentActorId: string | null;
  nextActorId: string | null; // NEW
  models: Array<{
    id: string;
    displayName: string;
    status: 'idle' | 'thinking' | 'answered' | 'judging' | 'judged';
    hasAnswered?: boolean;
    hasJudged?: boolean;
    answerPreview?: string; // NEW
  }>;
  answerPreviews: Record<string, string>; // NEW: modelId -> preview
}
```

Add a helper function to determine next actor:

```tsx
function getNextActorId(
  models: ArenaDisplayState['models'],
  masterId: string | null,
  roundStatus: string | null
): string | null {
  if (!roundStatus) return null;

  if (roundStatus === 'question_creation' || roundStatus === 'answering') {
    // Next model to answer (non-master who hasn't answered)
    const respondingModels = models.filter(m => m.id !== masterId);
    const next = respondingModels.find(m => !m.hasAnswered);
    return next?.id ?? null;
  }

  if (roundStatus === 'judging') {
    // Next model to judge
    const next = models.find(m => !m.hasJudged);
    return next?.id ?? null;
  }

  return null;
}
```

Update the `handleStepCompleted` callback to track answer previews:

```tsx
const handleStepCompleted = useCallback((data: StepCompletedEvent) => {
  setArenaState((prev) => {
    if (!prev) return null;

    let updatedState = { ...prev, currentStepType: null, currentActorId: null };

    // Update based on step type
    if (data.stepType === 'master_topic' && data.output.selectedTopic) {
      updatedState.topicName = data.output.selectedTopic;
    } else if (data.stepType === 'master_question' && data.output.question) {
      updatedState.questionContent = data.output.question;
      updatedState.roundStatus = 'answering';
    }

    // Track answer preview
    if (data.stepType === 'model_answer' && data.actorId && data.output.answerPreview) {
      updatedState.answerPreviews = {
        ...updatedState.answerPreviews,
        [data.actorId]: data.output.answerPreview,
      };
    }

    // Update model status and merge answer previews
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

    // Calculate next actor
    updatedState.nextActorId = getNextActorId(
      updatedState.models,
      updatedState.masterId,
      updatedState.roundStatus
    );

    return updatedState;
  });

  // ... existing activity logging ...
}, [addActivity]);
```

Update the `ArenaCircle` component call:

```tsx
<ArenaCircle
  models={displayState.models}
  masterId={displayState.masterId ?? undefined}
  currentActorId={displayState.currentActorId ?? undefined}
  nextActorId={displayState.nextActorId ?? undefined}
  currentStepType={displayState.currentStepType ?? undefined}
  onModelClick={setSelectedModelId}
/>
```

**Verification:**
- [ ] Answer previews populate when models answer
- [ ] Next actor ID correctly identifies upcoming model
- [ ] State updates properly on each SSE event

---

## Step 1.7: Add Thinking Animation Polish

Enhance the thinking animation in `ModelNode.tsx` to be more visually distinctive.

**File:** `app/client/src/components/arena/ModelNode.tsx`

Update the thinking ring animation:

```tsx
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
      opacity="0.5"
      initial={{ scale: 1, opacity: 0.3 }}
      animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      style={{ transformOrigin: `${x}px ${y}px` }}
    />
  </>
)}
```

Also add a small "typing dots" indicator below the model name when thinking:

```tsx
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
```

**Verification:**
- [ ] Thinking animation is visually distinctive
- [ ] Dots animate in sequence
- [ ] Animation is smooth, not jarring

---

## Step 1.8: Integration Testing

Test the complete enhanced arena UI:

1. **Empty State:**
   - [ ] Navigate to `/arena` with no session
   - [ ] Verify animated empty state shows
   - [ ] Connection status indicator works

2. **Game Start:**
   - [ ] Create and start session from `/admin/game`
   - [ ] Arena page shows models in circle
   - [ ] Master has crown indicator

3. **Answering Phase:**
   - [ ] Trigger question creation step
   - [ ] Verify question appears in panel
   - [ ] Trigger first model answer
   - [ ] Verify thinking animation shows
   - [ ] Verify speech bubble appears after answer
   - [ ] Verify "next" indicator on upcoming model

4. **All Models Answer:**
   - [ ] Complete all answer steps
   - [ ] Each model shows bubble with preview
   - [ ] Bubbles position correctly (no overlaps)

5. **Judging Phase:**
   - [ ] Trigger judging steps
   - [ ] Model states update to "judging"
   - [ ] "Next" indicator works for judges

6. **Click Interaction:**
   - [ ] Click on model opens detail modal
   - [ ] Full answer visible in modal

---

## Final Checklist

Before marking Phase 1 complete:

- [ ] All steps in Progress Tracker are ✅
- [ ] No TypeScript compilation errors
- [ ] Speech bubbles render correctly on all positions
- [ ] Animations are smooth (60fps)
- [ ] Works on mobile viewport (bubbles may need size adjustment)
- [ ] SSE events trigger appropriate state updates

**Next:** Proceed to `PHASE_2_ROUND_COMPLETION_UX.md`
