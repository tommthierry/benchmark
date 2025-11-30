# Phase 3: Game Engine Fixes & Step Control

## Objective

Fix critical issues in the game engine and add step control features:
1. Fix judging phase order (first judge = first answerer, not master)
2. Add LLM call retry logic on failure
3. Add "redo step" functionality for manual mode

## Prerequisites

- Phases 0-2 completed (admin game control, arena UI, round completion)
- Read `MASTER_PLAN.md` for context
- Understand current game-engine.ts implementation

## Progress Tracker

| Step | Task | Status |
|------|------|--------|
| 3.1 | Fix judging order in game-engine.ts | ✅ |
| 3.2 | Add LLM retry logic with configurable retries | ✅ |
| 3.3 | Add redo step API endpoint | ✅ |
| 3.4 | Update shared types for redo functionality | ✅ |
| 3.5 | Update admin GamePage with redo button | ✅ |
| 3.6 | Integration testing | ✅ |

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `app/server/src/services/game-engine.ts` | MODIFY | Fix judging order, add retry logic, add redo method |
| `app/server/src/api/arena.ts` | MODIFY | Add redo step endpoint |
| `app/shared/src/types/arena.ts` | MODIFY | Add types for redo functionality |
| `app/client/src/pages/admin/GamePage.tsx` | MODIFY | Add redo button |
| `app/client/src/lib/api.ts` | MODIFY | Add redo API call |

---

## Step 3.1: Fix Judging Order

**Problem:** When transitioning from answering to judging phase, the current code picks judges in the order of `modelIds` array. This means the master (who is at some position in the array) might judge early or even first.

**Correct flow:**
1. First judge = first model that answered (the first non-master who responded)
2. Continue clockwise through responding models
3. Master judges LAST (to break ties with authoritative ranking)

**File:** `app/server/src/services/game-engine.ts`

Find the `executeJudgingStep` method and modify judge selection:

```typescript
/**
 * Execute judging step (one judge at a time)
 * Order: First answerer → other responders → Master last
 */
private async executeJudgingStep(
  round: schema.Round,
  modelIds: string[]
): Promise<StepInfo> {
  // Get existing judgments
  const existingJudgments = await db
    .select()
    .from(schema.roundSteps)
    .where(
      and(
        eq(schema.roundSteps.roundId, round.id),
        eq(schema.roundSteps.stepType, 'model_judge')
      )
    );

  const judgedModelIds = new Set(existingJudgments.map(j => j.actorModelId));

  // Get answer order to determine judging order
  const answerSteps = await db
    .select()
    .from(schema.roundSteps)
    .where(
      and(
        eq(schema.roundSteps.roundId, round.id),
        eq(schema.roundSteps.stepType, 'model_answer'),
        eq(schema.roundSteps.status, 'completed')
      )
    )
    .orderBy(schema.roundSteps.stepNumber);

  // Build judging order: answerers in answer order, then master last
  const answererIds = answerSteps.map(s => s.actorModelId!);
  const judgingOrder = [...answererIds, round.masterId];

  // Find next judge who hasn't judged yet
  const nextJudgeId = judgingOrder.find(id => !judgedModelIds.has(id));

  if (!nextJudgeId) {
    // All models have judged, move to scoring
    return this.executeScoringStep(round);
  }

  // ... rest of existing judging logic ...
}
```

**Key change:** Instead of using `modelIds.find()`, we now build `judgingOrder` from:
1. Answer steps ordered by stepNumber (first to answer → first to judge)
2. Master appended at the end

**Verification:**
- [ ] First judge is the first model that answered
- [ ] Judges proceed in answer order
- [ ] Master judges last
- [ ] `areAllJudgmentsComplete` still works correctly

---

## Step 3.2: Add LLM Retry Logic

**Problem:** If an LLM call fails (network error, timeout, rate limit), the step fails and game stops.

**Solution:** Add retry logic with exponential backoff directly in step execution methods.

**File:** `app/server/src/services/game-engine.ts`

Add a retry helper method:

```typescript
/**
 * Execute an LLM call with retry logic
 */
private async executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      const isRetryable = this.isRetryableError(lastError);

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelayMs * Math.pow(2, attempt);
      logger.warn({
        attempt: attempt + 1,
        maxRetries,
        delay,
        error: lastError.message,
      }, 'LLM call failed, retrying...');

      await this.delay(delay);
    }
  }

  throw lastError;
}

/**
 * Check if error is retryable (network, rate limit, etc.)
 */
private isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('503') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('socket hang up')
  );
}
```

Then wrap LLM calls in step execution methods:

```typescript
// Example in executeMasterTopicStep:
const response = await this.executeWithRetry(
  () => providerManager.sendPrompt(
    master.providerId,
    master.providerModelId,
    prompt,
    { temperature: 0.7, maxTokens: 300 }
  )
);
```

**Verification:**
- [ ] Retry logic triggers on network errors
- [ ] Exponential backoff delays are correct
- [ ] Non-retryable errors fail immediately
- [ ] Success after retry works correctly

---

## Step 3.3: Add Redo Step API Endpoint

**Problem:** Admins cannot retry a failed step or redo a step that produced bad output.

**Solution:** Add `/api/arena/redo` endpoint that:
1. Deletes the last completed/failed step
2. Resets round status if needed
3. Allows re-execution with "Execute Next Step"

**File:** `app/server/src/services/game-engine.ts`

Add method to GameEngine class:

```typescript
/**
 * Redo the last step (delete it and allow re-execution)
 * Only works in manual mode for the most recent step
 */
async redoLastStep(sessionId?: string): Promise<{
  deletedStep: StepInfo | null;
  newRoundStatus: string | null;
}> {
  // Get session
  let session;
  if (sessionId) {
    [session] = await db
      .select()
      .from(schema.gameSessions)
      .where(eq(schema.gameSessions.id, sessionId));
  } else {
    [session] = await db
      .select()
      .from(schema.gameSessions)
      .where(inArray(schema.gameSessions.status, ['created', 'running', 'paused']))
      .orderBy(desc(schema.gameSessions.createdAt))
      .limit(1);
  }

  if (!session) {
    throw new Error('No active session found');
  }

  if (!session.currentRoundId) {
    throw new Error('No active round to redo step in');
  }

  // Get the last step in current round
  const [lastStep] = await db
    .select()
    .from(schema.roundSteps)
    .where(eq(schema.roundSteps.roundId, session.currentRoundId))
    .orderBy(desc(schema.roundSteps.stepNumber))
    .limit(1);

  if (!lastStep) {
    throw new Error('No steps to redo');
  }

  // Delete associated judgments if this was a judge step
  if (lastStep.stepType === 'model_judge' && lastStep.actorModelId) {
    await db
      .delete(schema.modelJudgments)
      .where(
        and(
          eq(schema.modelJudgments.roundId, session.currentRoundId),
          eq(schema.modelJudgments.judgeModelId, lastStep.actorModelId)
        )
      );
  }

  // Delete the step
  await db
    .delete(schema.roundSteps)
    .where(eq(schema.roundSteps.id, lastStep.id));

  // Determine new round status based on remaining steps
  const newStatus = await this.recalculateRoundStatus(session.currentRoundId);

  // Update round status
  await db
    .update(schema.rounds)
    .set({ status: newStatus })
    .where(eq(schema.rounds.id, session.currentRoundId));

  logger.info({
    sessionId: session.id,
    roundId: session.currentRoundId,
    deletedStepId: lastStep.id,
    deletedStepType: lastStep.stepType,
    newStatus,
  }, 'Step redone (deleted)');

  this.emitEvent('step_redone', {
    sessionId: session.id,
    roundId: session.currentRoundId,
    deletedStepType: lastStep.stepType,
    newRoundStatus: newStatus,
  });

  return {
    deletedStep: this.mapStepToInfo(lastStep),
    newRoundStatus: newStatus,
  };
}

/**
 * Recalculate round status based on existing steps
 */
private async recalculateRoundStatus(roundId: string): Promise<RoundStatus> {
  const steps = await db
    .select()
    .from(schema.roundSteps)
    .where(eq(schema.roundSteps.roundId, roundId))
    .orderBy(desc(schema.roundSteps.stepNumber));

  if (steps.length === 0) {
    return 'created';
  }

  const lastCompletedStep = steps.find(s => s.status === 'completed');
  if (!lastCompletedStep) {
    return 'created';
  }

  // Determine status based on last completed step type
  switch (lastCompletedStep.stepType) {
    case 'master_topic':
      return 'topic_selection';
    case 'master_question':
      return 'question_creation';
    case 'model_answer':
      // Check if all answers complete
      const [round] = await db
        .select()
        .from(schema.rounds)
        .where(eq(schema.rounds.id, roundId));
      const [session] = await db
        .select()
        .from(schema.gameSessions)
        .where(eq(schema.gameSessions.id, round.sessionId));
      const respondingCount = session.participatingModelIds.length - 1;
      const answerCount = steps.filter(
        s => s.stepType === 'model_answer' && s.status === 'completed'
      ).length;
      return answerCount >= respondingCount ? 'judging' : 'answering';
    case 'model_judge':
      return 'judging';
    case 'scoring':
      return 'completed';
    default:
      return 'created';
  }
}
```

**File:** `app/server/src/api/arena.ts`

Add endpoint:

```typescript
/**
 * POST /api/arena/redo
 * Redo (delete) the last step to allow re-execution
 */
router.post('/redo', async (req, res, next) => {
  try {
    const { sessionId } = req.body as { sessionId?: string };

    const engine = getGameEngine();
    const result = await engine.redoLastStep(sessionId);

    res.json({ data: result });
  } catch (error) {
    if (
      (error as Error).message.includes('No active session') ||
      (error as Error).message.includes('No active round') ||
      (error as Error).message.includes('No steps to redo')
    ) {
      return res.status(400).json({ error: (error as Error).message });
    }
    next(error);
  }
});
```

**Verification:**
- [ ] Redo deletes the last step
- [ ] Associated judgments are deleted for judge steps
- [ ] Round status is recalculated correctly
- [ ] Cannot redo when no steps exist
- [ ] Event is emitted for UI update

---

## Step 3.4: Update Shared Types

**File:** `app/shared/src/types/arena.ts`

Add types for redo functionality:

```typescript
export interface RedoStepResult {
  deletedStep: StepInfo | null;
  newRoundStatus: RoundStatus | null;
}

export interface StepRedoneEvent {
  type: 'step_redone';
  timestamp: string;
  sessionId: string;
  roundId: string;
  deletedStepType: StepType;
  newRoundStatus: RoundStatus;
}
```

Add to ArenaEvent union type if exists.

---

## Step 3.5: Update Admin GamePage

**File:** `app/client/src/lib/api.ts`

Add redo API method:

```typescript
export const arenaApi = {
  // ... existing methods ...
  redo: async (sessionId?: string) => {
    const res = await fetch('/api/arena/redo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Failed to redo step');
    }
    return res.json();
  },
};
```

**File:** `app/client/src/pages/admin/GamePage.tsx`

Add redo button to NextStepCard:

```typescript
function NextStepCard({
  state,
  isManual
}: {
  state: CurrentArenaState | null;
  isManual: boolean;
}) {
  const queryClient = useQueryClient();

  const triggerMutation = useMutation({
    mutationFn: () => arenaApi.trigger(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arena'] });
    },
  });

  const redoMutation = useMutation({
    mutationFn: () => arenaApi.redo(state?.session?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arena'] });
    },
  });

  // Determine what happens next
  const nextStep = getNextStepInfo(state);
  const canTrigger = state?.session &&
    state.session.status !== 'completed' &&
    state.session.status !== 'failed' &&
    state.session.status !== 'paused';

  // Can redo if there's an active round with at least one step
  const canRedo = state?.currentRound && isManual;

  return (
    <div className="bg-gray-800 rounded-lg p-6 border-2 border-blue-500/30">
      {/* ... existing header ... */}

      {/* ... existing next step description ... */}

      {/* Button row */}
      {isManual && (
        <div className="flex gap-3">
          {/* Redo Button */}
          <button
            onClick={() => redoMutation.mutate()}
            disabled={redoMutation.isPending || !canRedo}
            className="flex-1 py-3 px-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700
                       disabled:text-gray-500 rounded-lg font-medium transition-colors
                       flex items-center justify-center gap-2"
          >
            {redoMutation.isPending ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Undoing...
              </>
            ) : (
              <>
                <RotateCcw size={18} />
                Redo Last Step
              </>
            )}
          </button>

          {/* Execute Button */}
          <button
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending || !canTrigger}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700
                       disabled:text-gray-500 rounded-lg font-medium transition-colors
                       flex items-center justify-center gap-2"
          >
            {triggerMutation.isPending ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Executing...
              </>
            ) : (
              <>
                <Play size={18} />
                Execute Next Step
              </>
            )}
          </button>
        </div>
      )}

      {/* Error messages */}
      {(triggerMutation.isError || redoMutation.isError) && (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-700/50 rounded-lg text-sm text-red-400">
          {((triggerMutation.error || redoMutation.error) as Error).message}
        </div>
      )}
    </div>
  );
}
```

Import `RotateCcw` from lucide-react.

**Verification:**
- [ ] Redo button appears in manual mode
- [ ] Redo button disabled when no steps to redo
- [ ] Clicking redo deletes last step
- [ ] UI updates after redo
- [ ] Error message shows on failure

---

## Step 3.6: Integration Testing

Test the complete flow:

1. **Judging Order:**
   - [ ] Create session with 3+ models
   - [ ] Complete answering phase
   - [ ] Verify first judge is first answerer
   - [ ] Verify master judges last

2. **Retry Logic:**
   - [ ] Temporarily break LLM connection
   - [ ] Trigger step
   - [ ] Verify retry attempts are logged
   - [ ] Fix connection
   - [ ] Verify step completes after retry

3. **Redo Functionality:**
   - [ ] Complete a few steps
   - [ ] Click Redo
   - [ ] Verify last step is deleted
   - [ ] Click Execute Next Step
   - [ ] Verify step re-executes
   - [ ] Test redo on different step types (answer, judge)

4. **Edge Cases:**
   - [ ] Redo with no steps
   - [ ] Redo after round completion
   - [ ] Multiple redos in sequence

---

## Final Checklist

Before marking Phase 3 complete:

- [x] All steps in Progress Tracker are ✅
- [x] No TypeScript compilation errors
- [x] Judging order is correct (first answerer → responders → master)
- [x] LLM retry logic works
- [x] Redo functionality works
- [x] Admin UI shows redo button

**Phase 3 Complete!** All fixes have been implemented and tested.

---

## Summary of Changes Made

### 1. Judging Order Fix (`game-engine.ts`)
The `executeJudgingStep` method now builds judging order from:
1. Answer steps (ordered by `stepNumber`)
2. Master appended at the end

This ensures the first answerer judges first and the master judges LAST.

### 2. LLM Retry Logic (`game-engine.ts`)
Added two new private methods:
- `executeWithRetry<T>()` - Wraps LLM calls with retry logic
- `isRetryableError()` - Checks if error is transient

All four LLM call sites now use retry:
- `executeMasterTopicStep`
- `executeMasterQuestionStep`
- `executeAnsweringStep`
- `executeJudgingStep`

### 3. Step Back Functionality (True Undo)
Complete step erasure that fully reverts all state:

**What it does:**
- Deletes the last step from `round_steps` table
- Deletes associated `model_judgments` (for judge steps)
- Clears round fields (`topicId`, `questionContent`, `questionDifficulty`) when appropriate
- Recalculates round status based on remaining completed steps
- Broadcasts `step:undone` SSE event with `clearedFields` info
- Updates ArenaPage UI (removes speech bubbles, resets model status)

**Files Changed:**
- `app/shared/src/types/events.ts` - Added `StepUndoneEvent` type
- `app/server/src/services/game-engine.ts` - Added `undoLastStep()` and `calculateUndoState()`
- `app/server/src/services/event-bridge.ts` - Mapped `step_undone` → `step:undone`
- `app/server/src/api/arena.ts` - Added `POST /api/arena/undo` endpoint
- `app/client/src/hooks/useArenaEvents.ts` - Added `onStepUndone` handler
- `app/client/src/pages/ArenaPage.tsx` - Added `handleStepUndone` to revert UI state
- `app/client/src/pages/admin/GamePage.tsx` - Renamed to "Step Back" button
- `app/client/src/lib/api.ts` - Added `undo()` API method

### API Endpoint
```
POST /api/arena/undo
Body: { sessionId?: string }
Response: {
  data: {
    deletedStep: StepInfo | null,
    newRoundStatus: RoundStatus | null,
    clearedFields: { topicId?: boolean, questionContent?: boolean }
  }
}
```

### SSE Event
```typescript
interface StepUndoneEvent {
  type: 'step:undone';
  sessionId: string;
  roundId: string;
  deletedStepType: StepType;
  deletedActorId?: string;
  newRoundStatus: RoundStatus;
  clearedFields: { topicId?: boolean; questionContent?: boolean };
}
```
