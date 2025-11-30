# SABE - Project Context

## Overview

SABE (Systeme Autonome de Benchmarking Evolutif) is an autonomous LLM benchmarking platform. Single Docker container, Node.js monorepo.

**Current Status:** AI Arena COMPLETE - All 5 phases implemented (0-4)

**All AI Arena phases completed!** The system is fully functional.

## Admin-First Architecture

SABE follows an **admin-first** philosophy. All core entities are fully manageable through:
1. **REST APIs** (already implemented in Phase 1-2)
2. **Admin UI** (Phase 5) - hidden section for managing everything

### What Can Be Managed

| Entity | API Endpoint | Admin UI | Description |
|--------|-------------|----------|-------------|
| **Game Control** | `/api/arena/*` | `/admin/game` | Full game state + manual step control |
| **Providers** | `/api/providers` | `/admin/providers` | LLM API providers (OpenRouter, etc.) |
| **Models** | `/api/models` | `/admin/models` | LLM models with costs, context size |
| **Questions** | `/api/questions` | `/admin/questions` | Benchmark prompts with eval criteria |
| **Question Types** | `/api/questions/types` | `/admin/question-types` | Categories (reasoning, code, factual) |
| **Config** | `/api/config` | `/admin/settings` | Game settings (rounds, step delay) |
| **Runs** | `/api/runs` | User section | Benchmark executions |
| **Rankings** | `/api/rankings` | Dashboard | Model rankings and trends |

### Model Discovery Flow

The system supports discovering and importing models from providers:
1. Provider created via API or Admin UI
2. `/api/llm/providers/:id/models` fetches available models from provider API
3. Admin UI allows selecting and importing models to database
4. Imported models can then be used in benchmarks

## Tech Stack (Verified November 2025)

- **Runtime:** Node.js 20+, TypeScript 5.9
- **Backend:** Express 5.1, Pino logging
- **Frontend:** React 19.2, Vite 7, TailwindCSS 4
- **Database:** (Phase 1) Drizzle ORM, SQLite
- **State:** (Phase 5) TanStack Query 5, Zustand 5
- **Charts:** (Phase 5) Apache ECharts
- **Scheduler:** (Phase 6) node-cron

## Project Structure

```
app/
├── shared/     # Types, schemas, constants (@sabe/shared)
├── server/     # Express API, services, scheduler
└── client/     # React SPA, pages, components
```

- `plan/` contains implementation phases - read MASTER_PLAN.md first
- `data/` holds SQLite database (gitignored)

## Commands

```bash
# Development
npm install                    # Install all workspaces
npm run build:shared           # Build shared package first
npm run dev                    # Start backend (port 3000)
npm run dev:client            # Start frontend (port 5173)

# Database (from app/server directory)
npm run db:generate           # Generate migrations from schema
npm run db:push              # Push schema changes (dev only)
npm run db:studio            # Open Drizzle Studio GUI

# Production
docker compose build           # Build container
docker compose up -d           # Run in background
docker compose down            # Stop container

# Verification
curl http://localhost:3000/api/health
```

## Code Style

- Use ES modules (`"type": "module"`)
- Prefer `const` over `let`, no `var`
- Use async/await, avoid callbacks
- Zod for all API input validation (from Phase 1)
- Pino for logging (JSON in prod, pretty in dev)

## API Patterns

- All routes prefixed `/api/`
- Response format: `{ data: ... }` or `{ error: string, details?: ... }`
- Return 201 for create, 204 for delete, 400 for validation errors

## Express 5 Notes

- Wildcard routes use `{*path}` syntax (not `*`)
- Example: `app.get('{*path}', handler)` for SPA fallback

## Working with Phases

Implementation is split into phases in `plan/`:
1. Read `MASTER_PLAN.md` for overview
2. Each `PHASE_X_*.md` has a Progress Tracker table
3. Status: ⬜ NOT STARTED → 🟡 IN PROGRESS → ✅ COMPLETED
4. Follow verification checklist before moving to next phase

## Phase Status (Original Benchmark Platform)

- **Phase 0:** ✅ COMPLETED - Foundation, Docker, Hello World
- **Phase 1:** ✅ COMPLETED - Backend Core (DB, APIs)
- **Phase 2:** ✅ COMPLETED - LLM Integration (OpenRouter, retry, rate limiting)
- **Phase 3:** ✅ COMPLETED - Benchmark Engine (Runner, Evaluators, Results)
- **Phase 4:** ✅ COMPLETED - Ranking System (Calculator, Temporal Analysis, APIs)
- **Phase 5:** ✅ COMPLETED - Frontend (React Dashboard, Admin UI)
- **Phase 6:** ✅ COMPLETED - Automation (Scheduler, LLM-as-Judge, Graceful Shutdown)

## AI Arena Phase Status

- **Phase 0:** ✅ COMPLETED - Settings/Status Refactoring, Execution Config
- **Phase 1:** ✅ COMPLETED - Game Engine (sessions, rounds, steps, judging)
- **Phase 2:** ✅ COMPLETED - Real-time SSE Layer (event bridge, useArenaEvents hook)
- **Phase 3:** ✅ COMPLETED - Public Arena UI (circular layout, real-time updates)
- **Phase 4:** ✅ COMPLETED - Judging Phase UX (bubble clearing, modal tabs, navigation)

## AI Arena Game Engine (Phase 1)

Services in `app/server/src/services/`:
- `getGameEngine()` - Singleton for game orchestration
- `prompt-builder.ts` - Prompt templates for Master/Judge/Answer

Arena API endpoints:
- `GET /api/arena/sessions` - List all sessions
- `POST /api/arena/sessions` - Create new session
- `GET /api/arena/sessions/:id` - Session detail with rounds
- `POST /api/arena/sessions/:id/start` - Start automatic mode
- `POST /api/arena/sessions/:id/pause` - Pause session
- `POST /api/arena/trigger` - Execute next step (manual mode)
- `GET /api/arena/current` - Current game state for display
- `POST /api/arena/undo` - Step back - completely erase last step
- `GET /api/arena/rounds/:id` - Round detail with steps/judgments
- `GET /api/arena/rounds/:id/scores` - Round rankings
- `GET /api/arena/rounds/:roundId/models/:modelId` - Model round detail

**Running the Arena (Manual Mode):**
```bash
# Create session
curl -X POST http://localhost:3000/api/arena/sessions \
  -H "Content-Type: application/json" \
  -d '{"totalRounds": 3}'

# Trigger next step (repeat until session completes)
curl -X POST http://localhost:3000/api/arena/trigger \
  -H "Content-Type: application/json" \
  -d '{}'

# Step back (erase last step completely)
curl -X POST http://localhost:3000/api/arena/undo \
  -H "Content-Type: application/json" \
  -d '{}'

# Check current state
curl http://localhost:3000/api/arena/current
```

**Game Flow:**
1. **Master Selection** - Rotating through models
2. **Topic Selection** - Master picks from question types
3. **Question Creation** - Master generates question
4. **Answering** - Each non-master model answers sequentially
5. **Judging** - First answerer judges first → other responders → Master judges LAST
6. **Scoring** - Aggregate scores, master breaks ties

**LLM Retry Logic:**
All LLM calls automatically retry up to 3 times with exponential backoff (1s, 2s, 4s) on transient errors (rate limits, timeouts, network errors).

Database tables:
- `game_sessions` - Session tracking
- `rounds` - Individual rounds
- `round_steps` - Atomic steps (topic, question, answer, judge, scoring)
- `model_judgments` - Peer evaluation scores

## Real-time SSE Layer (AI Arena Phase 2)

Services in `app/server/src/services/`:
- `event-bridge.ts` - Bridges GameEngine events to SSE clients
- Heartbeat mechanism (30s interval keeps connections alive)

Middleware in `app/server/src/middleware/`:
- `sse.ts` - SSE middleware with `res.sse.send()` helpers

SSE API endpoints:
- `GET /api/arena/events` - SSE stream for real-time updates
- `GET /api/arena/events/status` - Connected client count

Client hook in `app/client/src/hooks/`:
- `useArenaEvents.ts` - React hook for SSE with auto-reconnect

**Event Types:**
| Event | Description |
|-------|-------------|
| `connected` | Initial connection acknowledgment |
| `state_snapshot` | Full current state on connect |
| `session:created` | New session created |
| `session:started` | Session started |
| `round:started` | New round with master info |
| `step:started` | Step began (model is thinking) |
| `step:completed` | Step done with output |
| `round:completed` | Round done with scores |
| `session:completed` | Session finished |

**Testing SSE:**
```bash
# Watch SSE events (stays connected)
curl -N http://localhost:3000/api/arena/events

# Check connected clients
curl http://localhost:3000/api/arena/events/status
```

**Using the React hook:**
```typescript
import { useArenaEvents } from './hooks/useArenaEvents';

function ArenaPage() {
  const { isConnected } = useArenaEvents({
    onStepCompleted: (data) => console.log('Step done:', data),
    onRoundCompleted: (data) => console.log('Scores:', data.scores),
  });

  return <div>Connected: {isConnected ? '✓' : '✗'}</div>;
}
```

## Admin Game Control Page

Full game state visibility and manual step control for administrators.

**Page:** `app/client/src/pages/admin/GamePage.tsx`
- Route: `/admin/game` (first item in admin navigation)
- Shows session status, current round, models, and next step preview
- Manual trigger button (when in manual execution mode)
- Session controls: Create, Pause, Resume

**Key Components:**
- `SessionCard` - Session status with progress stats
- `RoundCard` - Current round with master, topic, question
- `ModelsCard` - All participating models with status indicators
- `NextStepCard` - Shows exactly what happens next + trigger button
- `SessionControlsCard` - Session management buttons

## Public Arena UI (AI Arena Phase 3)

Public-facing arena page where visitors can watch AI models compete in real-time.

**Components in `app/client/src/components/arena/`:**
- `ArenaCircle.tsx` - SVG circular layout for models
- `ModelNode.tsx` - Individual model with state visualization, speech bubbles, next indicator
- `SpeechBubble.tsx` - Shows answer preview (~15 words) after model answers
- `RoundCompleteOverlay.tsx` - Animated leaderboard overlay at round end
- `QuestionPanel.tsx` - Current question display
- `ActivityFeed.tsx` - Live scrolling event feed
- `RoundProgress.tsx` - Progress bar for rounds
- `ModelDetailModal.tsx` - Detailed view of model answer/judgments

**Arena Page:** `app/client/src/pages/ArenaPage.tsx`
- Route: `/arena` (standalone, no sidebar)
- Real-time SSE integration via `useArenaEvents`
- Local state management for display
- Answer preview tracking for speech bubbles
- Round complete overlay integration

**Design System in `app/client/src/styles/`:**
- `design-tokens.css` - CSS custom properties (includes bubble colors, next ring color)
- `animations.ts` - Framer Motion variants

**Viewing the Arena:**
```bash
# Start server and client
npm run dev
npm run dev:client

# Open http://localhost:5173/arena (public view)
# Open http://localhost:5173/admin/game (admin control)

# Create session and trigger steps
curl -X POST http://localhost:3000/api/arena/sessions \
  -H "Content-Type: application/json" \
  -d '{"totalRounds": 3}'

curl -X POST http://localhost:3000/api/arena/trigger
```

**Model States:**
| Status | Visual |
|--------|--------|
| `idle` | Gray node |
| `thinking` | Blue with rotating ring + pulsing glow + typing dots |
| `next` | Dashed blue ring (next to answer/judge) |
| `answered` | Green border + speech bubble with preview |
| `judging` | Yellow border |
| `judged` | Green dot |

**Round Completion:**
When a round completes, an animated overlay shows:
- Winner highlight with confetti particles
- Leaderboard with staggered row animations
- Question recap
- Auto-dismisses after 15 seconds

## LLM Services (Phase 2)

Services in `app/server/src/services/llm/`:
- `getProviderManager()` - Singleton for LLM provider access
- `OpenRouterProvider` - OpenRouter API implementation
- `LLMClient` - Retry logic with exponential backoff
- `RateLimiter` - Token bucket rate limiting

LLM API endpoints:
- `GET /api/llm/status` - All provider statuses
- `GET /api/llm/providers/:id/test` - Test connectivity
- `GET /api/llm/providers/:id/models` - List available models
- `POST /api/llm/test` - Send test prompt (supports free models!)
- `POST /api/llm/providers/:id/reload` - Reload after config change

**Testing LLM calls:**
```bash
# With specific model (use free models for testing without credits)
curl -X POST http://localhost:3000/api/llm/test \
  -H "Content-Type: application/json" \
  -d '{"providerId":"<uuid>","model":"x-ai/grok-4.1-fast:free","prompt":"Hello"}'

# Default uses meta-llama/llama-3.2-3b-instruct:free
curl -X POST http://localhost:3000/api/llm/test \
  -H "Content-Type: application/json" \
  -d '{"providerId":"<uuid>","prompt":"Hello"}'
```

**Free OpenRouter models** (no credits needed):
- `x-ai/grok-4.1-fast:free` - Fast responses
- `meta-llama/llama-3.2-3b-instruct:free` - Default fallback
- Check `/api/llm/providers/:id/models` for more (filter by `:free` suffix)

Configuration:
- Create `.env` file in project root (see `app/server/.env.sample`)
- Set `OPENROUTER_API_KEY=sk-or-v1-...` in `.env`
- Create provider via `/api/providers` with `apiKeyEnvVar: "OPENROUTER_API_KEY"`

## Benchmark Engine (Phase 3)

Services in `app/server/src/services/`:
- `getBenchmarkRunner()` - Singleton for benchmark execution
- `getEvaluator()` - Rule-based evaluation (exact, contains, regex)

Benchmark API endpoints:
- `GET /api/runs` - List runs with pagination
- `POST /api/runs` - Start new benchmark run
- `GET /api/runs/:id` - Get run details
- `GET /api/runs/:id/progress` - Real-time progress
- `GET /api/runs/:id/summary` - Summary statistics
- `GET /api/runs/:id/results` - Results with evaluations
- `POST /api/runs/:id/cancel` - Cancel running benchmark

**Running a benchmark:**
```bash
# Start a run with all active models and questions
curl -X POST http://localhost:3000/api/runs \
  -H "Content-Type: application/json" \
  -d '{}'

# Start with specific models/questions and config
curl -X POST http://localhost:3000/api/runs \
  -H "Content-Type: application/json" \
  -d '{
    "modelIds": ["uuid-1", "uuid-2"],
    "questionIds": ["uuid-1"],
    "config": {"temperature": 0.5, "maxTokens": 500}
  }'

# Check progress
curl http://localhost:3000/api/runs/{runId}/progress

# Get results with evaluations
curl http://localhost:3000/api/runs/{runId}/results
```

**Evaluation methods:**
- `exact_match` - Match against expectedAnswer (100 exact, 75 partial, 0 none)
- `contains` - Check for keywords in evaluationCriteria.keywords
- `regex` - Match pattern in evaluationCriteria.pattern
- `llm_judge` - LLM-as-Judge evaluation (requires `LLM_JUDGE_PROVIDER_ID` env var)

## Ranking System (Phase 4)

Services in `app/server/src/services/`:
- `getRankingCalculator()` - Calculates global and per-type rankings
- `getTemporalAnalyzer()` - WoW/MoM comparisons and model trends

Rankings API endpoints:
- `GET /api/rankings/latest` - Latest global rankings
- `GET /api/rankings/types` - List available question types
- `GET /api/rankings/by-type/:type` - Rankings for specific question type
- `GET /api/rankings/compare/:period` - Temporal comparisons (wow, mom, qoq, yoy)
- `GET /api/rankings/history/:modelId` - Model ranking history
- `GET /api/rankings/trends` - All models' score trends
- `GET /api/rankings/run/:runId` - Rankings for specific run

**Getting rankings:**
```bash
# Latest global rankings
curl http://localhost:3000/api/rankings/latest

# Rankings by question type
curl http://localhost:3000/api/rankings/by-type/reasoning

# Week-over-week comparison
curl http://localhost:3000/api/rankings/compare/wow

# Model history
curl http://localhost:3000/api/rankings/history/{modelId}
```

**Ranking response format:**
```json
{
  "data": [{
    "modelId": "uuid",
    "position": 1,
    "score": 85.5,
    "previousPosition": 2,
    "deltaPosition": 1,
    "deltaScore": 5.2,
    "model": { "displayName": "Claude 3.5 Sonnet" }
  }],
  "run": { "id": "uuid", "iterationNumber": 5 }
}
```

**How rankings work:**
1. Rankings calculated automatically after each benchmark run completes
2. Global ranking: average score across all questions
3. Per-type rankings: average score per question category
4. Delta calculations compare to previous completed run
5. Positive deltaPosition = improved (moved up in ranking)

## Frontend (Phase 5)

The React frontend in `app/client/` provides a complete dashboard and admin UI.

**Technology Stack:**
- React 19 with React Router 7
- TanStack Query 5 for data fetching/caching
- Zustand 5 for UI state (with persist middleware)
- ECharts for trend visualization
- Lucide React for icons
- TailwindCSS 4 for styling

**File Structure:**
```
app/client/src/
├── main.tsx              # App entry with QueryClient + Router
├── App.tsx               # Route definitions
├── lib/api.ts            # API client with all endpoints
├── stores/uiStore.ts     # Zustand UI state
├── components/
│   ├── Layout.tsx        # Sidebar + Admin/User mode toggle
│   └── RankingsChart.tsx # ECharts line chart
└── pages/
    ├── RankingsPage.tsx  # User: Rankings dashboard
    ├── RunsPage.tsx      # User: Run history
    └── admin/
        ├── ProvidersPage.tsx    # CRUD + test connectivity
        ├── ModelsPage.tsx       # CRUD + import from provider
        ├── QuestionsPage.tsx    # CRUD with eval criteria
        ├── QuestionTypesPage.tsx # CRUD
        ├── StatusPage.tsx       # System status (read-only)
        └── SettingsPage.tsx     # Execution config (manual/cron, game settings)
```

**Running the frontend:**
```bash
npm run dev:client        # Start dev server on port 5173
npm run build:client      # Build for production
```

**Key Features:**
- User/Admin mode toggle (persisted)
- Rankings table with position/score changes
- ECharts trend visualization
- Run progress with real-time polling
- Model import from provider API
- Full CRUD for all entities

## Automation (Phase 6)

The server includes automated scheduling and LLM-as-Judge evaluation.

**Scheduler Service:** `app/server/src/scheduler/index.ts`
- Uses node-cron v4.2.1 for cron-like scheduling
- Weekly and monthly benchmark schedules
- Graceful shutdown on SIGTERM/SIGINT
- Concurrent run protection

**Schedule API endpoints:**
- `GET /api/schedule` - Get scheduler status and next run times
- `POST /api/schedule/start` - Start scheduler
- `POST /api/schedule/stop` - Stop scheduler
- `PUT /api/schedule` - Update schedule configuration
- `POST /api/schedule/trigger/:type` - Manually trigger weekly/monthly run
- `GET /api/schedule/validate?cron=...` - Validate cron expression

**Configuration (environment variables):**
```env
# Schedule config
SCHEDULE_WEEKLY_ENABLED=true
SCHEDULE_WEEKLY_CRON=0 2 * * 1
SCHEDULE_MONTHLY_ENABLED=true
SCHEDULE_MONTHLY_CRON=0 3 1 * *
TZ=UTC

# LLM-as-Judge config
LLM_JUDGE_PROVIDER_ID=your-provider-uuid
LLM_JUDGE_MODEL=anthropic/claude-3.5-sonnet
```

**Example schedule status:**
```bash
curl http://localhost:3000/api/schedule
# Returns: {"data":{"isRunning":true,"tasks":["weekly","monthly"],"nextRuns":{...}}}
```

## Execution Config (Phase 0)

The execution config controls the arena game flow. Stored in `execution_config` table.

**API Endpoints:**
- `GET /api/config` - Get current configuration
- `PUT /api/config` - Update configuration

**Configuration fields:**
- `executionMode`: `'manual'` or `'cron'`
- `cronExpression`: Cron schedule (e.g., `'0 2 * * 1'` = Monday 2AM)
- `timezone`: Timezone for cron (default: UTC)
- `autoStartEnabled`: Whether to auto-start on server boot
- `roundsPerSession`: Number of rounds per game session
- `stepDelayMs`: Delay between steps (for visibility)

**Example:**
```bash
# Get config
curl http://localhost:3000/api/config

# Switch to cron mode
curl -X PUT http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{"executionMode":"cron","cronExpression":"0 3 * * *"}'
```

## Gotchas

- Build `@sabe/shared` before server/client (`npm run build:shared`)
- Express 5 requires named wildcard params: `{*path}` not `*`
- TailwindCSS 4 uses CSS-first config: `@import "tailwindcss";`
- Frontend proxy routes `/api/*` to backend in dev mode
- LLM providers require API key in environment to be registered
- ECharts is a large library (~450kb gzipped) - consider code splitting for production
- node-cron v4 API differs from v3 (no `scheduled` option, uses `getNextRun()`)
