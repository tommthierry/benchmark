# SABE - High-Level Discovery Document

**Version:** 1.0
**Date:** 2025-11-28
**Purpose:** Discovery phase document for the next agent to create a detailed implementation plan
**Status:** Ready for Planning Phase

---

## 1. Project Identity

### What is SABE?

**SABE** (Système Autonome de Benchmarking Évolutif) is an autonomous LLM benchmarking platform that:

1. **Runs scheduled benchmarks** on multiple AI models (weekly/monthly)
2. **Stores all responses** with complete metadata (time, tokens, cost)
3. **Evaluates responses** using rules and LLM-as-Judge
4. **Calculates rankings** across multiple dimensions (by type, by date, by iteration)
5. **Tracks evolution** over time (WoW, MoM comparisons)
6. **Operates autonomously** with minimal human intervention

### Core Philosophy

> "Simple outside, powerful inside."

This is a **fun, internal project** - not enterprise software. The architecture should be:
- **Simple**: Easy to understand, deploy, and maintain
- **Encapsulated**: Single Docker container when possible
- **Pragmatic**: Ship fast, iterate based on real needs

---

## 2. Recommended Architecture: The Photomaton Pattern

Based on the reference architecture (`other/ARCHITECTURE.md`), we adopt a **simplified single-container monorepo** approach:

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Container                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   React 19      │    │      Express 5              │ │
│  │   Frontend      │◄──►│      Backend                │ │
│  │   (SPA)         │    │      (API + Static)         │ │
│  └─────────────────┘    └─────────────────────────────┘ │
│           │                         │                   │
│           │              ┌─────────────────────────────┐│
│           │              │     LLM Provider System     ││
│           │              │  ┌─────────────────────────┐││
│           │              │  │      OpenRouter         │││
│           │              │  │    (V1 - Single)        │││
│           │              │  └─────────────────────────┘││
│           │              └─────────────────────────────┘│
│           │                         │                   │
│           └─────────────────────────┼───────────────────┘
│                                     │                   │
│  ┌─────────────────────────────────────────────────────┐│
│  │              Data Layer                              ││
│  │  ┌─────────────────┐    ┌─────────────────────────┐ ││
│  │  │   SQLite DB     │    │    Job Scheduler        │ ││
│  │  │  (All Data)     │    │   (node-cron)           │ ││
│  │  └─────────────────┘    └─────────────────────────┘ ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Why This Architecture?

| Previous Plans | Our Choice | Rationale |
|---------------|------------|-----------|
| PHP/Symfony + DDD | Node.js/Express | Simpler, same language frontend/backend, faster dev |
| PostgreSQL + TimescaleDB | SQLite + Drizzle | Simpler for small data, zero config, single file |
| API Platform | Express REST | Lighter, less magic, more control |
| FrankenPHP | Node.js native | More mature, simpler deployment |
| Separate repos | Monorepo | Single container, shared types |
| 7 bounded contexts | Simple MVC + Services | We have ~8 tables, not enterprise complexity |

---

## 3. Recommended Technology Stack

### Backend

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| **Runtime** | Node.js | 22 LTS | Latest LTS, native SQLite support |
| **Framework** | Express | 5.x | Mature, simple, native async/await |
| **Language** | TypeScript | 5.x | Type safety, shared types with frontend |
| **Database** | SQLite | native | Zero config, single file, perfect for small data |
| **ORM** | Drizzle | latest | Type-safe, lightweight (~7kb), SQL-like |
| **Validation** | Zod | latest | Runtime schema validation, TypeScript types |
| **Logging** | Pino | latest | 5x faster than Winston, structured JSON |
| **HTTP Client** | Native fetch + retry | - | Built-in, no extra deps, with exponential backoff |
| **Scheduler** | node-cron | 4.x | Simple, cron syntax, in-process |

### Frontend

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| **Framework** | React | 19.x | Latest, concurrent features |
| **Build** | Vite | 7.x | 15x faster than Webpack |
| **Language** | TypeScript | 5.x | Type safety |
| **State (Server)** | TanStack Query | 5.x | Data fetching, caching, synchronization |
| **State (Client)** | Zustand | 5.x | Simple, minimal boilerplate |
| **Charts** | Apache ECharts | 5.x | Enterprise-grade, time-series support |
| **Tables** | TanStack Table | 8.x | Headless, powerful |
| **Styling** | TailwindCSS | 4.x | Utility-first, fast |

### Infrastructure

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Container** | Docker | Single container deployment |
| **Process** | Node.js native | No PM2 needed in container |
| **Volumes** | Docker volumes | Persist SQLite DB |

---

## 4. Core Data Model (Simplified)

Only **8 core tables** needed:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  providers  │────►│   models    │     │  questions  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                           │                   │
                    ┌──────┴───────────────────┴──────┐
                    │                                  │
                    ▼                                  ▼
              ┌─────────────┐                   ┌─────────────┐
              │ benchmark_  │                   │  question_  │
              │    runs     │                   │   types     │
              └─────────────┘                   └─────────────┘
                    │
                    │
                    ▼
              ┌─────────────┐
              │    task_    │
              │ executions  │
              └─────────────┘
                    │
         ┌─────────┴─────────┐
         ▼                   ▼
   ┌─────────────┐     ┌─────────────┐
   │ evaluations │     │  rankings   │
   └─────────────┘     └─────────────┘
```

### Table Summary

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `providers` | LLM API providers (OpenRouter for V1) | name, api_endpoint, status, config |
| `models` | LLM models catalog | provider_id, name, label, status, cost_per_token |
| `question_types` | Categories (reasoning, code, etc.) | name, weight |
| `questions` | Benchmark prompts | content, type_id, expected_answer, eval_method |
| `benchmark_runs` | Execution instances | started_at, status, iteration_number |
| `task_executions` | Individual model responses | run_id, model_id, question_id, response, time_ms, tokens |
| `evaluations` | Scored responses | execution_id, score, evaluator_type, justification |
| `rankings` | Calculated rankings | run_id, model_id, position, score, delta_position |

---

## 5. Key Features for V1 (MVP)

### Must Have (Foundation)

| Feature | Description |
|---------|-------------|
| **OpenRouter Integration** | Connect and call LLM APIs with retry/rate limiting |
| **Model Management** | CRUD for models, enable/disable, custom labels |
| **Question Bank** | CRUD for questions with types |
| **Manual Run** | Trigger benchmark manually |
| **Response Storage** | Store all responses with metadata |
| **Basic Evaluation** | Rule-based (exact match, contains, regex) |
| **Simple Ranking** | Score aggregation, position calculation |
| **Admin UI** | Enable/disable models, edit prompts |

### Should Have (MVP)

| Feature | Description |
|---------|-------------|
| **Scheduled Runs** | Weekly/monthly automated benchmarks |
| **LLM-as-Judge** | Use one model to evaluate others |
| **Ranking by Type** | Separate rankings per question category |
| **Delta Tracking** | Position/score changes vs previous run |
| **Basic Dashboard** | View rankings, trends |

### Nice to Have (Later)

| Feature | Description |
|---------|-------------|
| **WoW/MoM Comparisons** | Week-over-week, month-over-month |
| **Charts** | Time-series visualizations |
| **Export** | JSON/CSV export |

---

## 6. API Structure

Simple REST API, no complexity:

```
/api
├── /health                    # Health check
├── /providers                 # CRUD providers
│   ├── GET /                  # List
│   ├── POST /                 # Create
│   ├── GET /:id               # Read
│   ├── PUT /:id               # Update
│   └── DELETE /:id            # Delete
│
├── /models                    # CRUD models
│   ├── GET /                  # List (with filters)
│   ├── POST /                 # Create
│   ├── PUT /:id               # Update
│   └── PATCH /:id/status      # Toggle active/inactive
│
├── /questions                 # CRUD questions
│   ├── GET /                  # List
│   ├── POST /                 # Create
│   ├── PUT /:id               # Update
│   └── GET /types             # List question types
│
├── /runs                      # Benchmark executions
│   ├── GET /                  # List runs
│   ├── POST /                 # Start new run (manual)
│   ├── GET /:id               # Run details
│   └── GET /:id/results       # Run results
│
├── /rankings                  # Rankings data
│   ├── GET /latest            # Latest ranking
│   ├── GET /by-type/:type     # Ranking by question type
│   └── GET /history/:modelId  # Model ranking history
│
└── /config                    # Admin config
    ├── GET /prompts           # Get evaluation prompts
    └── PUT /prompts           # Update prompts
```

---

## 7. Project Structure

```
benchmark/
├── app/
│   ├── shared/                  # Shared types & utilities
│   │   ├── types/               # TypeScript interfaces
│   │   ├── schemas/             # Zod schemas
│   │   └── constants/           # Shared constants
│   │
│   ├── server/                  # Express backend
│   │   ├── src/
│   │   │   ├── api/             # Route handlers
│   │   │   ├── services/        # Business logic
│   │   │   │   ├── provider.service.ts
│   │   │   │   ├── llm-client.service.ts
│   │   │   │   ├── benchmark.service.ts
│   │   │   │   ├── evaluator.service.ts
│   │   │   │   └── ranking.service.ts
│   │   │   ├── db/              # Database
│   │   │   │   ├── schema.ts    # Drizzle schema
│   │   │   │   ├── migrations/  # DB migrations
│   │   │   │   └── index.ts     # DB connection
│   │   │   ├── scheduler/       # Cron jobs
│   │   │   ├── utils/           # Helpers
│   │   │   └── index.ts         # Entry point
│   │   └── package.json
│   │
│   └── client/                  # React frontend
│       ├── src/
│       │   ├── components/      # UI components
│       │   ├── pages/           # Route pages
│       │   ├── stores/          # Zustand stores
│       │   ├── api/             # TanStack Query hooks
│       │   └── App.tsx
│       ├── package.json
│       └── vite.config.ts
│
├── docker/
│   └── Dockerfile               # Multi-stage build
│
├── data/                        # Persisted data (gitignored)
│   └── sabe.db                  # SQLite database
│
├── docs/                        # Documentation (later)
│
├── docker-compose.yml
├── package.json                 # Workspace root
├── tsconfig.json                # Shared TS config
└── CLAUDE.md                    # AI agent knowledge base
```

---

## 8. Key Technical Decisions

### Decision 1: SQLite over PostgreSQL

**Rationale:**
- We'll have ~10-20 models, ~100 questions, ~1000 runs/year max
- SQLite handles this trivially with better-sqlite3 (fastest Node.js SQLite)
- Zero configuration, single file, easy backup
- Drizzle ORM makes switching to PostgreSQL trivial if needed later

### Decision 2: No DDD, Simple Services

**Rationale:**
- We have 8 tables, not 80
- Business logic is: call API → store → score → rank
- Services pattern is sufficient and much simpler
- Can always refactor to DDD if complexity grows (it won't)

### Decision 3: Single Container

**Rationale:**
- Express serves both API and built React static files
- No nginx/reverse proxy needed for small scale
- Scheduler runs in-process with node-cron
- One thing to deploy, one thing to monitor

### Decision 4: In-Process Scheduler

**Rationale:**
- node-cron is simple and sufficient
- No need for Redis/Bull/external job queue
- If container restarts, scheduled jobs resume immediately
- For a fun project, this is perfect

### Decision 5: Zod for Validation

**Rationale:**
- Runtime validation + TypeScript types from same source
- Shared between frontend and backend
- Lighter than class-validator + class-transformer

---

## 9. LLM Integration Pattern

### HTTP Client with Retry

```typescript
// Simplified pattern - use exponential backoff with jitter

async function callLLM(model: Model, prompt: string): Promise<LLMResponse> {
  const maxRetries = 3;
  let delay = 1000; // Start with 1 second

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(provider.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model.providerModelId,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.status === 429) {
        // Rate limited - wait and retry
        const retryAfter = response.headers.get('Retry-After');
        await sleep(retryAfter ? parseInt(retryAfter) * 1000 : delay);
        delay *= 2; // Exponential backoff
        continue;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();

    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await sleep(delay + Math.random() * 1000); // Add jitter
      delay *= 2;
    }
  }
}
```

### OpenRouter Specifics

- Base URL: `https://openrouter.ai/api/v1`
- Model format: `provider/model-name` (e.g., `anthropic/claude-3.5-sonnet`)
- Rate limits: 1000 req/day with $10+ credits, 50/day free
- Returns standard OpenAI-compatible response format

---

## 10. Admin Features (Critical for V1)

### Model Management
- **Enable/Disable models** easily from UI
- **Custom labels** per model (user-defined tags)
- **View model status** (last tested, success rate)

### Prompt Management
- **Edit system prompts** for LLM-as-Judge evaluations
- **Edit question prompts** (the benchmark questions)
- **Version tracking** (know which prompts were used in which run)

### Run Control
- **Manual trigger** benchmark run
- **View run progress** (in-progress, completed, failed)
- **Cancel running** benchmark if needed

---

## 11. What the Next Agent Needs to Do

### Phase 1: Foundation Setup
1. Initialize monorepo with npm workspaces
2. Set up TypeScript configuration (shared tsconfig)
3. Set up Express 5 with basic middleware
4. Set up Drizzle ORM with SQLite
5. Create database schema (all 8 tables)
6. Set up React + Vite + TailwindCSS
7. Create Docker configuration
8. Verify "Hello World" works end-to-end

### Phase 2: Core Backend
1. Implement provider service (OpenRouter)
2. Implement LLM client with retry logic
3. Implement model CRUD
4. Implement question CRUD
5. Implement benchmark runner
6. Implement basic evaluator (rule-based)
7. Implement ranking calculator

### Phase 3: Frontend
1. Create layout with navigation
2. Create model management page
3. Create question management page
4. Create benchmark run page
5. Create rankings dashboard
6. Create admin settings page

### Phase 4: Automation
1. Add node-cron scheduler
2. Configure weekly/monthly runs
3. Add LLM-as-Judge evaluation
4. Add delta calculations

---

## 12. Important Constraints

### For the Planning Agent

1. **Keep it simple** - Resist adding features not in V1 scope
2. **Single container** - Everything runs in one Docker container
3. **No external services** - No Redis, no PostgreSQL, no external queue
4. **Admin-first** - Admin features are as important as the benchmarking
5. **No auth** - This is internal, no authentication needed for V1
6. **Monorepo** - All code in single repo, shared types

### Technical Constraints

1. **SQLite concurrency** - One write at a time (fine for our scale)
2. **In-memory scheduler** - Jobs lost on restart, but that's OK
3. **No WebSocket** - Simple polling for run status
4. **Single language** - TypeScript everywhere

---

## 13. Success Criteria for Foundation

The foundation phase is complete when:

1. `docker compose up` starts the application
2. `http://localhost:3000` shows React frontend
3. `http://localhost:3000/api/health` returns JSON health check
4. Database migrations run automatically
5. Can create a model via API
6. Can create a question via API
7. Frontend fetches and displays data from API
8. All TypeScript compiles without errors
9. Shared types work between frontend/backend

---

## 14. References

### Stack Research Sources
- [Drizzle ORM SQLite Guide](https://orm.drizzle.team/docs/get-started-sqlite)
- [Better Stack Drizzle Guide](https://betterstack.com/community/guides/scaling-nodejs/drizzle-orm/)
- [TanStack Query Beginner Guide](https://betterstack.com/community/guides/scaling-nodejs/tanstack-for-beginners/)
- [Pino Logger Guide](https://signoz.io/guides/pino-logger/)
- [node-cron Package](https://www.npmjs.com/package/node-cron)
- [OpenRouter API Docs](https://openrouter.ai/docs/api/reference/overview)
- [OpenRouter Rate Limits](https://openrouter.ai/docs/limits)

### Original Project Documents
- Vision Document: `.claude/01_startProject/01_planClaude.md`
- Reference Architecture: `other/ARCHITECTURE.md`
- Previous Stack Analysis: `analysis/STACK_CHALLENGE_2025.md`
- Previous Foundation Plan: `analysis/FOUNDATION_PLAN.md`

---

## 15. Summary for Next Agent

**You are building a simple LLM benchmarking tool.**

**Core loop:**
1. Call LLM APIs with standard questions
2. Store responses with metadata
3. Score responses (rules + LLM-as-Judge)
4. Calculate rankings
5. Track changes over time

**Architecture:** Single Docker container with Express + React + SQLite

**Complexity level:** Small internal tool, NOT enterprise software

**Your job:** Create a detailed, step-by-step implementation plan that the development agent can follow to build this foundation, starting from an empty project to a working "Hello World" with all infrastructure in place.

**Remember:** Simple is better than clever. Ship fast, iterate later.

---

*Document created: 2025-11-28*
*Status: Ready for Planning Phase*
