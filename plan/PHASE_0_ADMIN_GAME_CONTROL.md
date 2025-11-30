# Phase 0: Admin Game Control Panel

## Objective

Create `/admin/game` page where administrators can:
- View complete game state (session, round, models, scores)
- Understand exactly what step comes next
- Trigger manual steps with a single button
- Start new sessions, pause/resume existing ones

## Prerequisites

- Read `MASTER_PLAN.md` for context
- Existing APIs: `/api/arena/current`, `/api/arena/trigger`, `/api/arena/sessions`
- Admin UI patterns from existing pages (`/admin/settings`, `/admin/models`)

## Progress Tracker

| Step | Task | Status |
|------|------|--------|
| 0.1 | Create GamePage.tsx component shell | ✅ |
| 0.2 | Add route and navigation | ✅ |
| 0.3 | Implement session status card | ✅ |
| 0.4 | Implement current round card | ✅ |
| 0.5 | Implement models status grid | ✅ |
| 0.6 | Implement next step preview | ✅ |
| 0.7 | Implement manual trigger button | ✅ |
| 0.8 | Implement session controls | ✅ |
| 0.9 | Clean up SettingsPage.tsx | ✅ |
| 0.10 | Integration testing | ✅ |

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `app/client/src/pages/admin/GamePage.tsx` | CREATE | Main game control page |
| `app/client/src/App.tsx` | MODIFY | Add route for `/admin/game` |
| `app/client/src/components/Layout.tsx` | MODIFY | Add "Game" nav item under Admin |
| `app/client/src/pages/admin/SettingsPage.tsx` | MODIFY | Remove execution mode section |

---

## Step 0.1: Create GamePage.tsx Component Shell

Create the basic page structure with sections for each card.

**File:** `app/client/src/pages/admin/GamePage.tsx`

```tsx
// Admin Game Control Page
// Full game state visibility and manual step control

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Pause,
  Plus,
  RefreshCw,
  Zap,
  Crown,
  Users,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
} from 'lucide-react';
import { arenaApi, configApi } from '../../lib/api';

export function GamePage() {
  const queryClient = useQueryClient();

  // Fetch current game state
  const { data: stateData, isLoading: stateLoading } = useQuery({
    queryKey: ['arena', 'current'],
    queryFn: arenaApi.getCurrentState,
    refetchInterval: 3000, // Poll every 3s for updates
  });

  // Fetch execution config
  const { data: configData } = useQuery({
    queryKey: ['config'],
    queryFn: configApi.get,
  });

  const state = stateData?.data;
  const config = configData?.data;
  const isManualMode = config?.executionMode === 'manual';

  if (stateLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Game Control</h1>
          <p className="text-gray-400 text-sm mt-1">
            Monitor and control the AI Arena game
          </p>
        </div>
        <ModeIndicator isManual={isManualMode} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Session & Round */}
        <div className="lg:col-span-2 space-y-6">
          <SessionCard state={state} />
          <RoundCard state={state} />
          <NextStepCard state={state} isManual={isManualMode} />
        </div>

        {/* Right Column - Models & Controls */}
        <div className="space-y-6">
          <SessionControlsCard state={state} />
          <ModelsCard state={state} />
        </div>
      </div>
    </div>
  );
}

// Placeholder components - implemented in subsequent steps
function ModeIndicator({ isManual }: { isManual: boolean }) {
  return (
    <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
      isManual
        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
        : 'bg-green-500/20 text-green-400 border border-green-500/30'
    }`}>
      {isManual ? 'Manual Mode' : 'Automatic Mode'}
    </div>
  );
}

function SessionCard({ state }: { state: any }) {
  return <div className="bg-gray-800 rounded-lg p-6">Session Card (Step 0.3)</div>;
}

function RoundCard({ state }: { state: any }) {
  return <div className="bg-gray-800 rounded-lg p-6">Round Card (Step 0.4)</div>;
}

function ModelsCard({ state }: { state: any }) {
  return <div className="bg-gray-800 rounded-lg p-6">Models Card (Step 0.5)</div>;
}

function NextStepCard({ state, isManual }: { state: any; isManual: boolean }) {
  return <div className="bg-gray-800 rounded-lg p-6">Next Step Card (Step 0.6)</div>;
}

function SessionControlsCard({ state }: { state: any }) {
  return <div className="bg-gray-800 rounded-lg p-6">Controls Card (Step 0.8)</div>;
}
```

**Verification:**
- [ ] File compiles without TypeScript errors
- [ ] Imports are correct

---

## Step 0.2: Add Route and Navigation

**File:** `app/client/src/App.tsx`

Add import at top:
```tsx
import { GamePage } from './pages/admin/GamePage';
```

Add route inside admin routes section:
```tsx
<Route path="/admin/game" element={<GamePage />} />
```

**File:** `app/client/src/components/Layout.tsx`

Add "Game" link to admin navigation. Look for the admin nav items array and add:
```tsx
{ path: '/admin/game', label: 'Game', icon: Gamepad2 }
```

Import `Gamepad2` from lucide-react at top of file.

**Verification:**
- [ ] Navigate to `/admin/game` shows the page
- [ ] Admin sidebar shows "Game" link
- [ ] Link highlights when active

---

## Step 0.3: Implement Session Status Card

Replace the `SessionCard` placeholder with full implementation.

```tsx
function SessionCard({ state }: { state: CurrentArenaState | null }) {
  const session = state?.session;

  if (!session) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target size={20} />
          Session Status
        </h2>
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center">
            <AlertCircle className="text-gray-500" size={24} />
          </div>
          <p className="text-gray-400">No active session</p>
          <p className="text-gray-500 text-sm mt-1">
            Create a new session to start the game
          </p>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    created: 'bg-blue-500/20 text-blue-400',
    running: 'bg-green-500/20 text-green-400',
    paused: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-gray-500/20 text-gray-400',
    failed: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target size={20} />
          Session Status
        </h2>
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[session.status]}`}>
          {session.status.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox label="Total Rounds" value={session.totalRounds} />
        <StatBox label="Completed" value={session.completedRounds} />
        <StatBox label="Models" value={session.participatingModelIds.length} />
        <StatBox
          label="Progress"
          value={`${Math.round((session.completedRounds / session.totalRounds) * 100)}%`}
        />
      </div>

      {session.startedAt && (
        <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500">
          Started: {new Date(session.startedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-900 rounded-lg p-3 text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
```

Add import for `CurrentArenaState` from `@sabe/shared`:
```tsx
import type { CurrentArenaState } from '@sabe/shared';
```

**Verification:**
- [ ] Shows "No active session" when no session exists
- [ ] Shows session stats when session exists
- [ ] Status badge color matches session status

---

## Step 0.4: Implement Current Round Card

Replace the `RoundCard` placeholder:

```tsx
function RoundCard({ state }: { state: CurrentArenaState | null }) {
  const round = state?.currentRound;

  if (!round) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare size={20} />
          Current Round
        </h2>
        <div className="text-center py-6 text-gray-500 text-sm">
          No round in progress
        </div>
      </div>
    );
  }

  const phaseLabels: Record<string, string> = {
    created: 'Starting...',
    topic_selection: 'Master Selecting Topic',
    question_creation: 'Master Creating Question',
    answering: 'Models Answering',
    judging: 'Models Judging',
    scoring: 'Calculating Scores',
    completed: 'Round Complete',
    failed: 'Round Failed',
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare size={20} />
          Round {round.roundNumber}
        </h2>
        <span className="text-sm text-blue-400">
          {phaseLabels[round.status] ?? round.status}
        </span>
      </div>

      {/* Master Info */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-gray-900 rounded-lg">
        <Crown className="text-yellow-500" size={18} />
        <div>
          <div className="text-xs text-gray-500">Master</div>
          <div className="font-medium">{round.masterName ?? 'Unknown'}</div>
        </div>
      </div>

      {/* Topic */}
      {round.topicName && (
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-1">Topic</div>
          <div className="text-sm bg-gray-900 rounded px-3 py-2">
            {round.topicName}
          </div>
        </div>
      )}

      {/* Question */}
      {round.questionContent && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Question</div>
          <div className="text-sm bg-gray-900 rounded px-3 py-2 leading-relaxed">
            {round.questionContent}
          </div>
          {round.questionDifficulty && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-300">
              {round.questionDifficulty}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
```

**Verification:**
- [ ] Shows "No round in progress" when appropriate
- [ ] Displays master with crown icon
- [ ] Shows topic and question when available
- [ ] Phase label updates correctly

---

## Step 0.5: Implement Models Status Grid

Replace the `ModelsCard` placeholder:

```tsx
function ModelsCard({ state }: { state: CurrentArenaState | null }) {
  const models = state?.models ?? [];
  const currentRound = state?.currentRound;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Users size={20} />
        Models ({models.length})
      </h2>

      {models.length === 0 ? (
        <div className="text-center py-6 text-gray-500 text-sm">
          No models in session
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {models.map((model) => (
            <ModelStatusRow
              key={model.id}
              model={model}
              isMaster={model.id === currentRound?.masterId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ModelStatusRow({
  model,
  isMaster
}: {
  model: { id: string; displayName: string; status: string; hasAnswered?: boolean; hasJudged?: boolean };
  isMaster: boolean;
}) {
  const statusConfig: Record<string, { color: string; label: string }> = {
    idle: { color: 'bg-gray-500', label: 'Idle' },
    thinking: { color: 'bg-blue-500 animate-pulse', label: 'Thinking...' },
    answered: { color: 'bg-green-500', label: 'Answered' },
    judging: { color: 'bg-yellow-500 animate-pulse', label: 'Judging...' },
    judged: { color: 'bg-green-500', label: 'Judged' },
  };

  const config = statusConfig[model.status] ?? statusConfig.idle;

  return (
    <div className="flex items-center justify-between p-2 bg-gray-900 rounded">
      <div className="flex items-center gap-2">
        {isMaster && <Crown size={14} className="text-yellow-500" />}
        <span className="text-sm font-medium truncate max-w-[150px]">
          {model.displayName}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {model.hasAnswered && (
          <CheckCircle size={12} className="text-green-500" title="Has answered" />
        )}
        {model.hasJudged && (
          <CheckCircle size={12} className="text-blue-500" title="Has judged" />
        )}
        <div className={`w-2 h-2 rounded-full ${config.color}`} title={config.label} />
      </div>
    </div>
  );
}
```

**Verification:**
- [ ] Lists all models in current session
- [ ] Master has crown icon
- [ ] Status indicator animates for thinking/judging
- [ ] Checkmarks appear when model has answered/judged

---

## Step 0.6: Implement Next Step Preview

Replace the `NextStepCard` placeholder:

```tsx
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

  // Determine what happens next
  const nextStep = getNextStepInfo(state);

  return (
    <div className="bg-gray-800 rounded-lg p-6 border-2 border-blue-500/30">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Zap size={20} className="text-blue-400" />
          Next Step
        </h2>
        {isManual && (
          <span className="text-xs text-gray-500">Manual mode enabled</span>
        )}
      </div>

      {/* Next step description */}
      <div className="bg-gray-900 rounded-lg p-4 mb-4">
        <div className="text-sm text-gray-400 mb-1">What happens next:</div>
        <div className="font-medium text-white">{nextStep.title}</div>
        <div className="text-sm text-gray-500 mt-1">{nextStep.description}</div>
      </div>

      {/* Manual trigger button */}
      {isManual && (
        <button
          onClick={() => triggerMutation.mutate()}
          disabled={triggerMutation.isPending || !state?.session || state.session.status === 'completed'}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500
                     rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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
      )}

      {!isManual && (
        <div className="text-center py-2 text-sm text-gray-500">
          Steps execute automatically in scheduled mode
        </div>
      )}

      {triggerMutation.isError && (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-700/50 rounded-lg text-sm text-red-400">
          {(triggerMutation.error as Error).message}
        </div>
      )}
    </div>
  );
}

function getNextStepInfo(state: CurrentArenaState | null): { title: string; description: string } {
  if (!state?.session) {
    return {
      title: 'Create Session',
      description: 'Start a new game session with active models',
    };
  }

  if (state.session.status === 'completed') {
    return {
      title: 'Session Complete',
      description: 'All rounds have been completed. Create a new session to play again.',
    };
  }

  if (state.session.status === 'paused') {
    return {
      title: 'Resume Session',
      description: 'The session is paused. Resume to continue.',
    };
  }

  if (!state.currentRound) {
    return {
      title: 'Start Round ' + (state.session.completedRounds + 1),
      description: 'A new round will begin with master selection',
    };
  }

  const round = state.currentRound;
  const models = state.models ?? [];
  const nonMasterModels = models.filter(m => m.id !== round.masterId);
  const answeredCount = nonMasterModels.filter(m => m.hasAnswered).length;
  const judgedCount = models.filter(m => m.hasJudged).length;

  switch (round.status) {
    case 'created':
      return {
        title: 'Master Selects Topic',
        description: `${round.masterName ?? 'Master'} will choose a topic category`,
      };

    case 'topic_selection':
      return {
        title: 'Master Creates Question',
        description: `${round.masterName ?? 'Master'} will generate a question`,
      };

    case 'question_creation':
    case 'answering':
      const nextToAnswer = nonMasterModels.find(m => !m.hasAnswered);
      return {
        title: nextToAnswer
          ? `${nextToAnswer.displayName} Answers`
          : 'Move to Judging',
        description: nextToAnswer
          ? `Model will answer the question (${answeredCount}/${nonMasterModels.length} complete)`
          : 'All models have answered, judging begins',
      };

    case 'judging':
      const nextToJudge = models.find(m => !m.hasJudged);
      return {
        title: nextToJudge
          ? `${nextToJudge.displayName} Judges`
          : 'Calculate Scores',
        description: nextToJudge
          ? `Model will rank all answers (${judgedCount}/${models.length} complete)`
          : 'All judgments received, calculating final scores',
      };

    case 'scoring':
      return {
        title: 'Complete Round',
        description: 'Scores will be tallied and the round will end',
      };

    case 'completed':
      return {
        title: 'Start Next Round',
        description: `Round ${round.roundNumber + 1} will begin with a new master`,
      };

    default:
      return {
        title: 'Continue',
        description: 'Execute the next step in the game',
      };
  }
}
```

**Verification:**
- [ ] Shows accurate next step prediction
- [ ] Button is disabled when no session or session complete
- [ ] Shows progress (X/Y complete) during answering/judging
- [ ] Error message displays on failure

---

## Step 0.7: Implement Manual Trigger Button

This is already included in Step 0.6. Verify it works:

**Verification:**
- [ ] Clicking button calls `/api/arena/trigger`
- [ ] Button shows loading state while executing
- [ ] Page refreshes state after trigger completes

---

## Step 0.8: Implement Session Controls Card

Replace the `SessionControlsCard` placeholder:

```tsx
function SessionControlsCard({ state }: { state: CurrentArenaState | null }) {
  const queryClient = useQueryClient();

  const createSessionMutation = useMutation({
    mutationFn: () => arenaApi.createSession({ totalRounds: 5 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arena'] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => arenaApi.pauseSession(state?.session?.id ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arena'] });
    },
  });

  const startMutation = useMutation({
    mutationFn: () => arenaApi.startSession(state?.session?.id ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arena'] });
    },
  });

  const session = state?.session;
  const canCreate = !session || session.status === 'completed' || session.status === 'failed';
  const canPause = session?.status === 'running';
  const canResume = session?.status === 'paused';

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Clock size={20} />
        Session Controls
      </h2>

      <div className="space-y-3">
        {/* Create New Session */}
        <button
          onClick={() => createSessionMutation.mutate()}
          disabled={!canCreate || createSessionMutation.isPending}
          className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-700
                     disabled:text-gray-500 rounded-lg font-medium transition-colors
                     flex items-center justify-center gap-2"
        >
          {createSessionMutation.isPending ? (
            <RefreshCw className="animate-spin" size={16} />
          ) : (
            <Plus size={16} />
          )}
          New Session
        </button>

        {/* Pause Button */}
        <button
          onClick={() => pauseMutation.mutate()}
          disabled={!canPause || pauseMutation.isPending}
          className="w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700
                     disabled:text-gray-500 rounded-lg font-medium transition-colors
                     flex items-center justify-center gap-2"
        >
          {pauseMutation.isPending ? (
            <RefreshCw className="animate-spin" size={16} />
          ) : (
            <Pause size={16} />
          )}
          Pause
        </button>

        {/* Resume Button */}
        <button
          onClick={() => startMutation.mutate()}
          disabled={!canResume || startMutation.isPending}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700
                     disabled:text-gray-500 rounded-lg font-medium transition-colors
                     flex items-center justify-center gap-2"
        >
          {startMutation.isPending ? (
            <RefreshCw className="animate-spin" size={16} />
          ) : (
            <Play size={16} />
          )}
          Resume
        </button>
      </div>

      {(createSessionMutation.isError || pauseMutation.isError || startMutation.isError) && (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-700/50 rounded-lg text-sm text-red-400">
          {((createSessionMutation.error || pauseMutation.error || startMutation.error) as Error)?.message}
        </div>
      )}
    </div>
  );
}
```

**Verification:**
- [ ] "New Session" creates a session (returns success)
- [ ] Pause button pauses running session
- [ ] Resume button resumes paused session
- [ ] Buttons disable appropriately based on state

---

## Step 0.9: Clean Up SettingsPage.tsx

Remove the execution mode section from `app/client/src/pages/admin/SettingsPage.tsx`.

**Changes:**
1. Remove the "Execution Mode" card (the one with Manual/Cron toggle)
2. Remove the `ManualTriggerSection` component entirely
3. Remove the `CronConfigSection` component
4. Keep only the "Game Settings" section (`GameSettingsSection`)

The settings page should now only contain:
- Header with title
- Game Settings section (rounds per session, step delay)

**Verification:**
- [ ] Settings page no longer shows execution mode toggle
- [ ] Settings page no longer shows manual trigger button
- [ ] Game Settings (rounds, delay) still works

---

## Step 0.10: Integration Testing

Test the complete flow:

1. **No Session State:**
   - [ ] Navigate to `/admin/game`
   - [ ] Verify "No active session" message shows
   - [ ] Verify models list is empty
   - [ ] Verify Next Step shows "Create Session"

2. **Create Session:**
   - [ ] Click "New Session" button
   - [ ] Verify session card shows status "created"
   - [ ] Verify models list populates

3. **Manual Execution:**
   - [ ] Ensure config is set to manual mode
   - [ ] Click "Execute Next Step"
   - [ ] Verify round starts and master is selected
   - [ ] Continue clicking through all steps of a round
   - [ ] Verify phase indicators update correctly

4. **Round Completion:**
   - [ ] Complete all steps until round completes
   - [ ] Verify completed rounds counter increments
   - [ ] Verify models reset to idle state

5. **Session Controls:**
   - [ ] Test pause functionality
   - [ ] Test resume functionality
   - [ ] Complete all rounds and verify session status becomes "completed"

---

## Final Checklist

Before marking Phase 0 complete:

- [ ] All steps in Progress Tracker are ✅
- [ ] No TypeScript compilation errors
- [ ] Page renders correctly on mobile viewport
- [ ] SSE events update the UI (if connected via `/arena`)
- [ ] All buttons have appropriate loading states
- [ ] Error states are handled gracefully

**Next:** Proceed to `PHASE_1_ARENA_UI_ENHANCEMENTS.md`
