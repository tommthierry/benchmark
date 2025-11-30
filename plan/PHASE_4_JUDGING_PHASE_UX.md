# Phase 4: Judging Phase UX Improvements

## Objective

Fix and enhance the judging phase user experience:
1. Clear speech bubbles when transitioning from answering to judging
2. Properly indicate the master does NOT answer (only creates question)
3. Allow viewing both Answer and Judgment data in ModelDetailModal
4. Ensure proper visual separation between answering and judging phases

## Problem Analysis

### Issue 1: Speech Bubbles Not Cleared During Judging
When transitioning from answering → judging:
- Speech bubbles showing answer previews persist
- This creates confusion as the UI still shows "answering" state visually
- Bubbles should be cleared OR visually distinguished for the new phase

### Issue 2: Master Not Distinguished Properly
The master model:
- Creates the question but does NOT answer
- Judges LAST (to break ties with authoritative ranking)
- Currently may show confusing states in UI

### Issue 3: ModelDetailModal Lacks Judgment View
Current modal shows:
- Answer section
- Judgments received

Missing:
- Judgments GIVEN (what the model ranked others)
- Tab navigation to switch between Answer and Judgment views
- Left/Right navigation in modal

## Progress Tracker

| Step | Task | Status |
|------|------|--------|
| 4.1 | Update ArenaPage to clear bubbles on judging transition | ✅ |
| 4.2 | Add phase-aware styling to ModelNode | ✅ |
| 4.3 | Enhance ModelDetailModal with tabs | ✅ |
| 4.4 | Add left/right navigation in modal | ✅ |
| 4.5 | Update event handlers for phase transitions | ✅ |
| 4.6 | Integration testing | ✅ |

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `app/client/src/pages/ArenaPage.tsx` | MODIFY | Clear bubbles on judging phase |
| `app/client/src/components/arena/ModelNode.tsx` | MODIFY | Phase-aware bubble display |
| `app/client/src/components/arena/ModelDetailModal.tsx` | MODIFY | Add Answer/Judgment tabs |

---

## Step 4.1: Clear Speech Bubbles on Judging Transition

When the round status changes to `judging`, we should clear all answer preview bubbles.

**File:** `app/client/src/pages/ArenaPage.tsx`

**Current Behavior:**
- `handleStepStarted` sets `roundStatus` to `judging` when step type is `model_judge`
- But `answerPreviews` are never cleared

**Fix:**
In `handleStepStarted`, when transitioning to judging phase:

```typescript
const handleStepStarted = useCallback((data: StepStartedEvent) => {
  setArenaState((prev) => {
    if (!prev) return null;

    let roundStatus = prev.roundStatus;
    if (data.stepType === 'master_topic') roundStatus = 'topic_selection';
    else if (data.stepType === 'master_question') roundStatus = 'question_creation';
    else if (data.stepType === 'model_answer') roundStatus = 'answering';
    else if (data.stepType === 'model_judge') roundStatus = 'judging';
    else if (data.stepType === 'scoring') roundStatus = 'scoring';

    // Determine if we're transitioning TO judging phase
    const isTransitioningToJudging =
      data.stepType === 'model_judge' && prev.roundStatus !== 'judging';

    const models = prev.models.map((m) => ({
      ...m,
      status: m.id === data.actorId
        ? (data.stepType === 'model_judge' ? 'judging' as const : 'thinking' as const)
        : m.status,
      // Clear answer preview when entering judging phase
      answerPreview: isTransitioningToJudging ? undefined : m.answerPreview,
    }));

    return {
      ...prev,
      currentStepType: data.stepType,
      currentActorId: data.actorId ?? null,
      roundStatus,
      models,
      // Clear answer previews when entering judging phase
      answerPreviews: isTransitioningToJudging ? {} : prev.answerPreviews,
      nextActorId: getNextActorId(models, prev.masterId, roundStatus),
    };
  });
  // ... rest of function
}, [addActivity]);
```

**Verification:**
- [ ] Speech bubbles disappear when first judge step starts
- [ ] Model nodes no longer show answer previews during judging
- [ ] Visual state clearly indicates judging phase

---

## Step 4.2: Phase-Aware ModelNode Styling

**File:** `app/client/src/components/arena/ModelNode.tsx`

Update props to receive current round phase and adjust visual state:

```typescript
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
  roundPhase?: 'answering' | 'judging' | null; // NEW: Current round phase
  onClick: () => void;
}
```

Update bubble visibility logic:

```typescript
// Show bubble ONLY during answering phase
const showBubble =
  roundPhase === 'answering' &&
  model.status === 'answered' &&
  !!model.answerPreview;
```

**Verification:**
- [ ] Bubbles only show during answering phase
- [ ] No bubbles visible during judging phase
- [ ] Master node never shows bubble (doesn't answer)

---

## Step 4.3: Enhance ModelDetailModal with Tabs

**File:** `app/client/src/components/arena/ModelDetailModal.tsx`

Add tab navigation between Answer and Judgments views:

```tsx
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Scale } from 'lucide-react';

type TabType = 'answer' | 'judgments';

export function ModelDetailModal({ modelId, roundId, onClose }: ModelDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('answer');

  // ... existing query logic ...

  return (
    <AnimatePresence>
      <motion.div /* ... existing backdrop ... */>
        <motion.div /* ... existing modal container ... */>
          {/* Header with tabs */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-bg-tertiary)]">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
                {detail?.model?.displayName ?? 'Loading...'}
              </h2>
              {detail?.isMaster && (
                <Crown size={16} className="text-[var(--color-master)]" />
              )}
            </div>

            {/* Tab buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('answer')}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  activeTab === 'answer'
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <MessageSquare size={12} className="inline mr-1" />
                Answer
              </button>
              <button
                onClick={() => setActiveTab('judgments')}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  activeTab === 'judgments'
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Scale size={12} className="inline mr-1" />
                Judgments
              </button>
            </div>

            <button onClick={onClose} /* ... existing close button ... */ />
          </div>

          {/* Tab Content */}
          <div className="p-4 space-y-5 overflow-y-auto max-h-[60vh]">
            {activeTab === 'answer' ? (
              <AnswerTabContent detail={detail} isLoading={isLoading} error={error} roundId={roundId} />
            ) : (
              <JudgmentsTabContent detail={detail} isLoading={isLoading} error={error} roundId={roundId} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Answer tab - shows model's answer and judgments RECEIVED
function AnswerTabContent({ detail, isLoading, error, roundId }) {
  // Existing answer section content
}

// Judgments tab - shows judgments this model GAVE to others
function JudgmentsTabContent({ detail, isLoading, error, roundId }) {
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={roundId ? 'Failed to load' : 'No round in progress'} />;
  if (!detail) return <ErrorState message="No details available" />;

  if (!detail.judgmentsGiven || detail.judgmentsGiven.length === 0) {
    return (
      <div className="text-center py-8">
        <Scale className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-3" />
        <p className="text-sm text-[var(--color-text-muted)]">
          {detail.isMaster ? 'Master will judge last' : 'No judgments given yet'}
        </p>
      </div>
    );
  }

  return (
    <section>
      <SectionHeader icon={Scale} title="Judgments Given" />
      <div className="space-y-2">
        {detail.judgmentsGiven.map((j) => (
          <div key={j.id} className="bg-[var(--color-bg-tertiary)] rounded-md p-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-[var(--color-text-muted)]">
                To: {j.targetName}
              </span>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                {j.score}/100 (Rank #{j.rank})
              </span>
            </div>
            {j.reasoning && (
              <div className="text-xs text-[var(--color-text-secondary)]">
                <Markdown compact>{j.reasoning}</Markdown>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
```

**Verification:**
- [ ] Tabs switch between Answer and Judgments views
- [ ] Judgments Given section shows all rankings this model gave
- [ ] Master indicator works correctly
- [ ] Empty state shows appropriate message

---

## Step 4.4: Add Left/Right Navigation in Modal

Allow navigating between models without closing the modal.

**File:** `app/client/src/components/arena/ModelDetailModal.tsx`

Update props and add navigation:

```tsx
interface ModelDetailModalProps {
  modelId: string;
  roundId?: string;
  onClose: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void; // NEW
  hasPrev?: boolean; // NEW
  hasNext?: boolean; // NEW
}

export function ModelDetailModal({
  modelId,
  roundId,
  onClose,
  onNavigate,
  hasPrev,
  hasNext,
}: ModelDetailModalProps) {
  // ... existing code ...

  return (
    <motion.div /* ... */>
      {/* Left navigation arrow */}
      {onNavigate && hasPrev && (
        <button
          onClick={() => onNavigate('prev')}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full
                     bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)]
                     text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]
                     transition-colors z-10"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Modal content */}
      <motion.div /* ... existing modal ... */ />

      {/* Right navigation arrow */}
      {onNavigate && hasNext && (
        <button
          onClick={() => onNavigate('next')}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full
                     bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)]
                     text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]
                     transition-colors z-10"
        >
          <ChevronRight size={24} />
        </button>
      )}
    </motion.div>
  );
}
```

**File:** `app/client/src/pages/ArenaPage.tsx`

Update modal usage to pass navigation props:

```tsx
// In ArenaPage component
const handleModalNavigate = useCallback((direction: 'prev' | 'next') => {
  if (!displayState || !selectedModelId) return;

  const modelIds = displayState.models.map(m => m.id);
  const currentIndex = modelIds.indexOf(selectedModelId);

  if (direction === 'prev' && currentIndex > 0) {
    setSelectedModelId(modelIds[currentIndex - 1]);
  } else if (direction === 'next' && currentIndex < modelIds.length - 1) {
    setSelectedModelId(modelIds[currentIndex + 1]);
  }
}, [displayState, selectedModelId]);

// In JSX
{selectedModelId && (
  <ModelDetailModal
    modelId={selectedModelId}
    roundId={displayState.currentRoundId ?? undefined}
    onClose={() => setSelectedModelId(null)}
    onNavigate={handleModalNavigate}
    hasPrev={displayState.models.findIndex(m => m.id === selectedModelId) > 0}
    hasNext={displayState.models.findIndex(m => m.id === selectedModelId) < displayState.models.length - 1}
  />
)}
```

**Verification:**
- [ ] Left/right arrows appear on modal sides
- [ ] Clicking navigates to adjacent model
- [ ] Arrows hidden at start/end of list
- [ ] Tab state resets when navigating

---

## Step 4.5: Update Event Handlers for Phase Transitions

Ensure the `getNextActorId` function properly handles the judging phase.

**File:** `app/client/src/pages/ArenaPage.tsx`

The current implementation at line 58-77 correctly handles judging but needs to ensure master judges LAST:

```typescript
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
    // During judging: responders first in answer order, master LAST
    const responders = models.filter(m => m.id !== masterId);
    const respondersWhoNeedToJudge = responders.filter(m => !m.hasJudged);

    if (respondersWhoNeedToJudge.length > 0) {
      return respondersWhoNeedToJudge[0]?.id ?? null;
    }

    // All responders judged, check if master still needs to judge
    const master = models.find(m => m.id === masterId);
    if (master && !master.hasJudged) {
      return master.id;
    }

    return null;
  }

  return null;
}
```

**Verification:**
- [ ] Next indicator shows correctly during judging phase
- [ ] Master is shown as "next" only after all responders have judged
- [ ] Indicator disappears after all judging complete

---

## Step 4.6: Integration Testing

Test the complete flow:

1. **Answering Phase:**
   - [ ] Create session with 3+ models
   - [ ] Complete topic and question selection
   - [ ] First model answers → bubble appears
   - [ ] Second model answers → bubble appears
   - [ ] All models answer → bubbles visible for all

2. **Transition to Judging:**
   - [ ] When first judge step starts, ALL bubbles should disappear
   - [ ] Master shown as NOT next (doesn't answer)
   - [ ] First responder shown as "next to judge"

3. **Judging Phase:**
   - [ ] Click model → modal opens
   - [ ] Switch to "Judgments" tab
   - [ ] If model has judged, show judgments given
   - [ ] If model hasn't judged, show "No judgments given yet"
   - [ ] Navigate left/right between models

4. **Master Behavior:**
   - [ ] Master never shows answer bubble
   - [ ] Master modal shows only "Master of this round" + question
   - [ ] Master judges LAST

---

## Final Checklist

Before marking Phase 4 complete:

- [x] All steps in Progress Tracker are ✅
- [x] No TypeScript compilation errors
- [x] Speech bubbles properly clear when entering judging phase
- [x] ModelDetailModal has working Answer/Judgments tabs
- [x] Left/right navigation works in modal
- [x] Master correctly judges LAST
- [x] Visual distinction between phases is clear

## Completion Summary

**Phase 4 COMPLETED** - All tasks finished and verified.

### Changes Made

1. **ArenaPage.tsx**
   - Updated `handleStepStarted` to detect judging phase transition and clear speech bubbles
   - Enhanced `getNextActorId` to properly order judging (responders first, master LAST)
   - Added `handleModalNavigate` for left/right model navigation
   - Pass `roundPhase` prop to ArenaCircle
   - Pass navigation props to ModelDetailModal

2. **ArenaCircle.tsx**
   - Added `roundPhase` prop to interface
   - Pass `roundPhase` to ModelNode components

3. **ModelNode.tsx**
   - Added `roundPhase` prop to interface
   - Updated bubble visibility logic: only show during answering phase
   - Master never shows bubble (doesn't answer)

4. **ModelDetailModal.tsx**
   - Complete rewrite with tabbed interface (Answer/Judgments)
   - Answer tab shows: answer content, response time, final score, judgments received
   - Judgments tab shows: judgments this model gave to others
   - Left/right navigation arrows for cycling between models
   - Keyboard navigation (← → Esc)
   - Reset tab to "Answer" when navigating to different model

### Behavioral Changes

- When first `model_judge` step starts, all answer preview bubbles disappear
- Clear visual transition from answering phase to judging phase
- Modal allows viewing what rankings a model assigned to others
- Can navigate between models without closing modal
