# SABE v2.0 - AI Arena Master Plan

## Project Vision

Transform SABE from a benchmark execution platform into an **AI Arena** - a live, turn-based system where LLMs compete, question each other, and judge one another. The result is a public-facing "battle arena" where visitors can watch AI models take turns being the "Master" who creates questions, while others answer and judge.

## Core Concept: The Arena Flow

```
ROUND FLOW:
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Master Selection                                       │
│  ─────────────────────────                                      │
│  • Select next Master from active models (rotating)             │
│  • Master picks topic from question pool                        │
│  • Master generates a new question (LLM creates the challenge)  │
├─────────────────────────────────────────────────────────────────┤
│  STEP 2: Answering Phase                                        │
│  ───────────────────────                                        │
│  • Each non-Master model answers ONE BY ONE                     │
│  • Order can be random or deterministic                         │
│  • Response + thinking visible in real-time                     │
├─────────────────────────────────────────────────────────────────┤
│  STEP 3: Judging Phase                                          │
│  ──────────────────────                                         │
│  • Each model (including Master) judges ALL other answers       │
│  • Judges rank and score each response                          │
│  • Master has tiebreaker authority                              │
├─────────────────────────────────────────────────────────────────┤
│  STEP 4: Results & Scoring                                      │
│  ─────────────────────────                                      │
│  • Aggregate judgments into scores                              │
│  • Update rankings                                              │
│  • Emit events for frontend                                     │
│  • Move to next round (new Master)                              │
└─────────────────────────────────────────────────────────────────┘
```

## Key Terminology

| Term | Definition |
|------|------------|
| **Round** | Complete cycle: master selection → answering → judging → scoring |
| **Step/Iteration** | Single atomic action (one model answers, one model judges, etc.) |
| **Master** | The LLM who creates the question for the current round |
| **Participant** | Non-Master LLM who answers the question |
| **Judge** | Every LLM judges other answers (peer evaluation) |
| **Arena** | Public frontend displaying real-time round progress |

## Phase Overview

| Phase | Name | Focus | Estimated Steps |
|-------|------|-------|-----------------|
| **0** | Settings & Status | Refactor admin pages, add settings controls | ~15 |
| **1** | Game Flow Engine | New DB schema, round/step state machine | ~25 |
| **2** | Real-time Layer | SSE for live updates to frontend | ~15 |
| **3** | Public Arena UI | Circular arena visualization | ~30 |

## Technology Decisions

### Real-time Updates: Server-Sent Events (SSE)

**Why SSE over WebSocket:**
- Unidirectional flow (server → client) matches our use case
- Built-in reconnection (browser handles it automatically)
- Works over standard HTTP/2 with multiplexing
- Simpler implementation, less server resources
- No need for Socket.IO complexity

**Implementation:** Native EventSource API + Express middleware

### Frontend Visualization

**Animation:** Framer Motion v3
- Excellent React integration
- State-based animations with variants
- Smooth transitions between game states

**Circular Layout:** Custom SVG + D3.js positioning
- D3 for calculating circular positions
- React for rendering SVG elements
- Framer Motion for animating transitions

**UI Components:** shadcn/ui + Radix primitives
- Already using TailwindCSS 4
- Accessible, unstyled primitives
- Full ownership of component code

### Design Philosophy (Avoiding AI Look)

**DO:**
- Asymmetric layouts, intentional white space
- Subtle, purposeful animations (not gratuitous)
- Consistent typography scale (use Golden Ratio)
- Dark theme with accent colors (not neon)
- Hand-crafted micro-interactions
- Information hierarchy (not everything equal)

**DON'T:**
- Purple-to-blue gradients everywhere
- Rounded everything with glow effects
- Robotic/tech fonts
- Grid-aligned symmetric layouts
- Generic hero sections
- Stock illustrations

## Database Evolution

### New Tables Required

```
game_sessions       - Track arena sessions (multiple rounds)
rounds              - Individual rounds within a session
round_steps         - Atomic steps within a round
model_judgments     - Peer evaluation scores
```

### Schema Integration

The new schema extends, not replaces, existing tables. Models, providers, and questions remain unchanged. Rankings table will be enhanced to track arena performance.

## Phase Dependencies

```
PHASE 0 ─── Foundation ───────────────────────────────────┐
    │                                                     │
    ▼                                                     │
PHASE 1 ─── Game Engine (requires Phase 0 settings) ──────┤
    │                                                     │
    ▼                                                     │
PHASE 2 ─── SSE Layer (requires Phase 1 events) ──────────┤
    │                                                     │
    ▼                                                     │
PHASE 3 ─── Arena UI (requires Phase 2 real-time) ────────┘
```

## Success Criteria

### Phase 0 Complete When:
- [x] Settings page renamed to Status
- [x] New Settings page with cron/manual toggle
- [x] Execution mode persisted to database
- [x] Manual trigger button works

### Phase 1 Complete When:
- [x] Game session can be created
- [x] Round flow executes correctly
- [x] Step-by-step iteration works
- [x] Peer judging produces rankings
- [x] All API endpoints tested

### Phase 2 Complete When:
- [x] SSE endpoint streams events
- [x] Frontend receives real-time updates
- [x] Reconnection works automatically
- [x] Events match all step types

### Phase 3 Complete When:
- [x] Arena page displays models in circle
- [x] Master is visually distinct
- [x] Current step highlighted
- [x] Click model shows details
- [x] Mobile responsive

## File Structure for Plan Documents

```
plan/
├── MASTER_PLAN.md          ← You are here
├── PHASE_0_SETTINGS.md     ← Settings/Status refactoring
├── PHASE_1_GAME_ENGINE.md  ← Core game flow logic
├── PHASE_2_REALTIME.md     ← SSE implementation
└── PHASE_3_ARENA_UI.md     ← Public frontend
```

## Quick Reference: Current Codebase

**Key Existing Services:**
- `BenchmarkRunner` → Will be replaced by `GameEngine`
- `Evaluator` → Enhanced for peer judging
- `Scheduler` → Enhanced for game session scheduling
- `RankingCalculator` → Enhanced for arena rankings

**Key Existing Routes:**
- `/api/runs` → Keep for historical benchmarks
- `/api/schedule` → Enhanced for game sessions
- New: `/api/arena` → Game session management
- New: `/api/arena/events` → SSE stream

**Frontend Routes:**
- `/admin/settings` → Rename to `/admin/status`
- New: `/admin/settings` → Execution control
- New: `/arena` → Public arena view

---

## AI Arena Phases Complete!

All four phases of the AI Arena have been implemented:

| Phase | Status | Completed |
|-------|--------|-----------|
| **Phase 0** | ✅ COMPLETED | Settings/Status refactoring |
| **Phase 1** | ✅ COMPLETED | Game Engine with peer judging |
| **Phase 2** | ✅ COMPLETED | Real-time SSE layer |
| **Phase 3** | ✅ COMPLETED | Public Arena UI |

The AI Arena is now a fully functional system where:
1. LLMs compete in turn-based rounds
2. Each model takes turns as the "Master" who creates questions
3. Other models answer and all models judge each other
4. Real-time updates stream to the public arena page
5. Visitors can watch the competition live

**To run the arena:**
```bash
# Start server
npm run dev

# Start client
npm run dev:client

# Open http://localhost:5173/arena

# Create session and trigger steps
curl -X POST http://localhost:3000/api/arena/sessions -d '{"totalRounds": 3}'
curl -X POST http://localhost:3000/api/arena/trigger
```
