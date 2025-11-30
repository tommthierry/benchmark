# AI Arena Enhancement - Master Plan

## Project Overview

**Goal:** Enhance the AI Arena game control and visualization to provide administrators with full game state visibility and manual step control, while improving the public-facing arena page UX.

**Current State:** AI Arena has a functional game engine, SSE real-time layer, and basic public arena UI. The game flow works but lacks:
1. Admin control panel for game management
2. Clear visual indication of game phases
3. Speech bubbles showing model responses
4. Detailed next-step preview

## Key Requirements

### Admin Game Page (`/admin/game`)
- Full game state visibility (session, round, step, scores)
- Clear indication of current phase and what happens next
- Manual "Next Step" button (when in manual mode)
- Model participation list with status
- Round history with expandable details

### Public Arena Page (`/arena`)
- Empty state when no game is running
- Clear phase indicators for each step
- Speech bubbles showing model responses (first 15 words)
- "Thinking" animation when model is processing
- "Next to answer" indicator
- Round completion leaderboard overlay
- Click-to-expand model answers

## Game Flow Recap

Each round follows this sequence:

| Step | Actor | Description |
|------|-------|-------------|
| 1. Select Master | System | Rotating clockwise (first round random) |
| 2. Select Topic | Master | Picks from question types |
| 3. Create Question | Master | Generates question for topic |
| 4. Answer | Models (1-by-1) | Each non-master model answers sequentially |
| 5. Judge | All Models | All models (including master) rank answers |
| 6. Score | System | Aggregate scores, master breaks ties |
| 7. Show Results | System | Display round leaderboard |

## Implementation Phases

| Phase | Focus | Deliverable | Status |
|-------|-------|-------------|--------|
| **0** | Admin Game Control Panel | `/admin/game` with full state + manual trigger | ✅ COMPLETED |
| **1** | Arena UI Enhancements | Speech bubbles, thinking states, next indicator | ✅ COMPLETED |
| **2** | Round Completion UX | Leaderboard overlay, score animations | ✅ COMPLETED |
| **3** | Game Engine Fixes | Judging order, LLM retry, step redo | ✅ COMPLETED |
| **4** | Judging Phase UX | Clear bubbles on judging, modal tabs, navigation | ✅ COMPLETED |

## Phase Details

### Phase 0: Admin Game Control Panel
**Duration:** ~4 hours

Create `/admin/game` page providing:
- Current game state dashboard
- Session management (start new, pause, resume)
- Step-by-step execution button
- Clear "what happens next" indicator
- Remove execution mode from `/admin/settings` (keep game settings only)

**Files Created/Modified:**
- `app/client/src/pages/admin/GamePage.tsx` (NEW)
- `app/client/src/App.tsx` (add route)
- `app/client/src/components/Layout.tsx` (add nav item)
- `app/client/src/pages/admin/SettingsPage.tsx` (simplify)

### Phase 1: Arena UI Enhancements
**Duration:** ~6 hours

Enhance `/arena` page with:
- Speech bubble component for model responses
- Improved model states (thinking with animation, next-to-answer highlight)
- Empty state when no game running
- Click model to see full answer
- Better visual hierarchy for game phases

**Files Created/Modified:**
- `app/client/src/components/arena/SpeechBubble.tsx` (NEW)
- `app/client/src/components/arena/ModelNode.tsx` (enhance)
- `app/client/src/components/arena/ArenaCircle.tsx` (enhance)
- `app/client/src/pages/ArenaPage.tsx` (enhance)
- `app/client/src/styles/design-tokens.css` (add bubble styles)

### Phase 2: Round Completion UX
**Duration:** ~3 hours

Add round completion experience:
- Animated leaderboard overlay at round end
- Score change animations
- Question recap with winner highlight
- Smooth transition to next round

**Files Created/Modified:**
- `app/client/src/components/arena/RoundCompleteOverlay.tsx` (NEW)
- `app/client/src/components/arena/ScoreAnimation.tsx` (NEW)
- `app/client/src/pages/ArenaPage.tsx` (integrate overlay)

### Phase 3: Game Engine Fixes
**Duration:** ~2 hours

Critical fixes for game engine logic and manual mode control:
- Fix judging order (first answerer judges first, master judges LAST)
- Add LLM retry logic with exponential backoff
- Add "redo step" functionality for manual mode

**Files Modified:**
- `app/server/src/services/game-engine.ts` (judging order, retry, redo)
- `app/server/src/api/arena.ts` (add `/redo` endpoint)
- `app/shared/src/types/game.ts` (add `RedoStepResult` type)
- `app/client/src/lib/api.ts` (add redo API method)
- `app/client/src/pages/admin/GamePage.tsx` (add redo button)

## Technical Decisions

### State Management
- Continue using TanStack Query for server state
- Local React state for UI-only concerns (modals, animations)
- SSE events update query cache via `invalidateQueries`

### Component Library
- Keep using Framer Motion for animations
- CSS-first approach for speech bubbles (pseudo-elements)
- Tailwind CSS 4 for styling

### API Endpoints
Key endpoints for the arena:
- `GET /api/arena/current` - Full game state
- `POST /api/arena/trigger` - Execute next step (manual mode)
- `POST /api/arena/undo` - Step back (erase last step completely)
- `POST /api/arena/sessions` - Create session
- `GET /api/arena/rounds/:id/scores` - Round scores

## Progress Tracking

Each phase document contains a Progress Tracker table:

| Status | Meaning |
|--------|---------|
| ⬜ | Not started |
| 🟡 | In progress |
| ✅ | Completed |

**IMPORTANT:** Update status as you complete each step. Mark completed items immediately after verification.

## Verification Checklist

Before marking a phase complete:

1. [ ] All components render without errors
2. [ ] SSE events properly update UI
3. [ ] Manual trigger button works (admin page)
4. [ ] Visual states match design spec
5. [ ] No TypeScript errors
6. [ ] Works on both desktop and mobile viewport

## Getting Started

1. Read this document completely
2. Read the phase you're implementing
3. Follow steps in order
4. Mark progress as you go
5. Verify checklist before moving on

**All phases completed!** The AI Arena game control and UI enhancements are fully implemented.

## Completed Work

### Phase 0 Summary (Completed)
- Created `/admin/game` page with full game state visibility
- Session management (create, pause, resume)
- Manual step execution button with next-step preview
- Model status grid with indicators
- Removed execution mode from Settings page (kept game settings only)
- Navigation added to admin sidebar

### Phase 1 Summary (Completed)
- Created `SpeechBubble` component with CSS-based tail
- Added speech bubble CSS variables to design tokens
- Enhanced `ModelNode` with:
  - Speech bubbles showing answer previews
  - "Next to answer" dashed ring indicator
  - Enhanced thinking animation (rotating ring + pulsing glow + typing dots)
- Updated `ArenaCircle` to pass `nextActorId` and `answerPreview` props
- Improved empty state with animated icon
- Updated `ArenaPage` state handling for answer preview tracking

### Phase 2 Summary (Completed)
- Created `RoundCompleteOverlay` component with:
  - Animated leaderboard with staggered row animations
  - Winner highlight with confetti particles
  - Question recap section
  - Rank change indicators (up/down/same)
  - Auto-dismiss after 15 seconds with progress bar
  - Smooth modal animations
- Integrated overlay with `ArenaPage` round completion event

### Phase 3 Summary (Completed)
- Fixed judging order: first answerer judges first, master judges LAST
  - Master can now effectively break ties with authoritative ranking
- Added LLM retry logic with exponential backoff:
  - 3 retries with 1s → 2s → 4s delays
  - Retries on transient errors (rate limit, timeout, network)
- Added true "Step Back" functionality:
  - `POST /api/arena/undo` completely erases last step from DB
  - Clears round fields (topic, question) when appropriate
  - Recalculates round status based on remaining steps
  - Broadcasts `step:undone` SSE event with `clearedFields`
  - ArenaPage handles event to remove speech bubbles, reset model status
  - Admin GamePage has "Step Back" button (not automatic re-execution)

### Phase 4 Summary (Completed)
- Fixed speech bubbles to clear when transitioning to judging phase
  - Detect first `model_judge` step and clear all answer previews
  - Master never shows a speech bubble (doesn't answer)
- Added phase-aware bubble visibility in ModelNode
  - Bubbles only visible during `answering` phase
  - `roundPhase` prop passed through ArenaCircle to ModelNode
- Enhanced ModelDetailModal with tabs:
  - Answer tab: model's answer, response time, final score, judgments received
  - Judgments tab: rankings this model gave to other models
- Added left/right navigation in modal:
  - Chevron buttons on modal sides
  - Keyboard navigation: ← → Esc
  - Tab resets to "Answer" when navigating between models
- Improved `getNextActorId` to correctly order judging:
  - Responders judge first (in answer order)
  - Master judges LAST
