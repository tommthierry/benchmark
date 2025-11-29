# SABE - Project Context

## Overview

SABE (Systeme Autonome de Benchmarking Evolutif) is an autonomous LLM benchmarking platform. Single Docker container, Node.js monorepo.

**Current Status:** Phase 6 COMPLETED - Full Autonomous Platform

## Admin-First Architecture

SABE follows an **admin-first** philosophy. All core entities are fully manageable through:
1. **REST APIs** (already implemented in Phase 1-2)
2. **Admin UI** (Phase 5) - hidden section for managing everything

### What Can Be Managed

| Entity | API Endpoint | Admin UI | Description |
|--------|-------------|----------|-------------|
| **Providers** | `/api/providers` | `/admin/providers` | LLM API providers (OpenRouter, etc.) |
| **Models** | `/api/models` | `/admin/models` | LLM models with costs, context size |
| **Questions** | `/api/questions` | `/admin/questions` | Benchmark prompts with eval criteria |
| **Question Types** | `/api/questions/types` | `/admin/question-types` | Categories (reasoning, code, factual) |
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

## Phase Status

- **Phase 0:** ✅ COMPLETED - Foundation, Docker, Hello World
- **Phase 1:** ✅ COMPLETED - Backend Core (DB, APIs)
- **Phase 2:** ✅ COMPLETED - LLM Integration (OpenRouter, retry, rate limiting)
- **Phase 3:** ✅ COMPLETED - Benchmark Engine (Runner, Evaluators, Results)
- **Phase 4:** ✅ COMPLETED - Ranking System (Calculator, Temporal Analysis, APIs)
- **Phase 5:** ✅ COMPLETED - Frontend (React Dashboard, Admin UI)
- **Phase 6:** ✅ COMPLETED - Automation (Scheduler, LLM-as-Judge, Graceful Shutdown)

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
        └── SettingsPage.tsx     # System status
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

## Gotchas

- Build `@sabe/shared` before server/client (`npm run build:shared`)
- Express 5 requires named wildcard params: `{*path}` not `*`
- TailwindCSS 4 uses CSS-first config: `@import "tailwindcss";`
- Frontend proxy routes `/api/*` to backend in dev mode
- LLM providers require API key in environment to be registered
- ECharts is a large library (~450kb gzipped) - consider code splitting for production
- node-cron v4 API differs from v3 (no `scheduled` option, uses `getNextRun()`)
