# SABE - Master Implementation Plan

**Version:** 1.0
**Created:** 2025-11-28
**Project:** Système Autonome de Benchmarking Évolutif
**Status:** Ready for Implementation

---

## 1. Project Overview

### What We're Building

SABE is an **autonomous LLM benchmarking platform** that:
- Runs scheduled benchmarks on multiple AI models (weekly/monthly)
- Stores all responses with complete metadata (time, tokens, cost)
- Evaluates responses using rules and LLM-as-Judge
- Calculates rankings across multiple dimensions
- Tracks evolution over time (WoW, MoM comparisons)
- Operates autonomously with minimal intervention

### Architecture Decision

**Single Docker container monorepo** using:
- **Backend:** Node.js 22 LTS + Express 5 + TypeScript
- **Database:** SQLite + Drizzle ORM
- **Frontend:** React 19 + Vite + TailwindCSS 4
- **Scheduler:** node-cron (in-process)

Reference: `plan/HIGH_LEVEL_DISCOVERY.md`

---

## 2. Technology Stack (Verified November 2025)

### Backend
| Component | Package | Version | Purpose |
|-----------|---------|---------|---------|
| Runtime | Node.js | 22 LTS | Server runtime |
| Framework | express | 5.x | HTTP server, routing |
| Language | typescript | 5.x | Type safety |
| ORM | drizzle-orm | latest | Database queries |
| DB Driver | better-sqlite3 | latest | SQLite driver |
| Validation | zod | latest | Schema validation |
| Logging | pino | latest | Structured JSON logs |
| Scheduler | node-cron | latest | Cron-like scheduling |
| HTTP Client | native fetch | - | LLM API calls |

### Frontend
| Component | Package | Version | Purpose |
|-----------|---------|---------|---------|
| Framework | react | 19.x | UI framework |
| Build | vite | 6.x | Build tool |
| Styling | tailwindcss | 4.x | Utility CSS |
| State (Server) | @tanstack/react-query | 5.x | Data fetching |
| State (Client) | zustand | 5.x | UI state |
| Charts | echarts | 5.x | Visualizations |
| Tables | @tanstack/react-table | 8.x | Data tables |

### Infrastructure
| Component | Choice | Purpose |
|-----------|--------|---------|
| Container | Docker | Single container |
| Volumes | Docker volumes | Persist SQLite |
| Process | Node.js native | No PM2 needed |

---

## 3. Phase Overview

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 0: Foundation          │ Project setup, Docker, dirs │
├─────────────────────────────────────────────────────────────┤
│ PHASE 1: Backend Core        │ DB schema, Express API base │
├─────────────────────────────────────────────────────────────┤
│ PHASE 2: LLM Integration     │ OpenRouter, LLM client      │
├─────────────────────────────────────────────────────────────┤
│ PHASE 3: Benchmark Engine    │ Runner, evaluator           │
├─────────────────────────────────────────────────────────────┤
│ PHASE 4: Ranking System      │ Rankings, temporal analysis │
├─────────────────────────────────────────────────────────────┤
│ PHASE 5: Frontend            │ React UI, dashboard         │
├─────────────────────────────────────────────────────────────┤
│ PHASE 6: Automation          │ Scheduler, full autonomy    │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Phase Descriptions

### PHASE 0: Foundation Setup
**File:** `PHASE_0_FOUNDATION.md`
**Goal:** Working "Hello World" with all infrastructure
**Deliverables:**
- Monorepo structure with npm workspaces
- TypeScript configuration (shared)
- Docker + docker-compose setup
- Basic Express server running
- Basic React app running
- End-to-end connectivity verified

### PHASE 1: Backend Core
**File:** `PHASE_1_BACKEND_CORE.md`
**Goal:** Database and API foundation
**Deliverables:**
- Drizzle ORM setup with SQLite
- All 8 database tables created
- Migrations system working
- CRUD APIs for providers, models, questions
- Zod validation on all endpoints
- Pino logging configured

### PHASE 2: LLM Integration
**File:** `PHASE_2_LLM_INTEGRATION.md`
**Goal:** Connect to OpenRouter and call LLM APIs
**Deliverables:**
- Provider service abstraction
- LLM client with retry logic
- Rate limiting implementation
- OpenRouter integration tested
- Error handling for API failures

### PHASE 3: Benchmark Engine
**File:** `PHASE_3_BENCHMARK_ENGINE.md`
**Goal:** Execute benchmarks and evaluate responses
**Deliverables:**
- Benchmark runner service
- Task execution pipeline
- Rule-based evaluator (exact, regex, contains)
- Response storage with metadata
- Manual benchmark trigger API

### PHASE 4: Ranking System
**File:** `PHASE_4_RANKING_SYSTEM.md`
**Goal:** Calculate and store rankings
**Deliverables:**
- Ranking calculator service
- Global rankings
- Rankings by question type
- Delta calculations (position changes)
- Temporal analyzer (WoW comparisons)

### PHASE 5: Frontend
**File:** `PHASE_5_FRONTEND.md`
**Goal:** React dashboard and admin UI
**Deliverables:**
- Layout with navigation
- Model management page
- Question management page
- Rankings dashboard with charts
- Run history and details view
- Admin settings page

### PHASE 6: Automation
**File:** `PHASE_6_AUTOMATION.md`
**Goal:** Full autonomous operation
**Deliverables:**
- node-cron scheduler setup
- Weekly/monthly benchmark schedules
- LLM-as-Judge evaluation
- Run status monitoring
- Error notifications (logging)

---

## 5. Progress Tracking

Each phase document contains a **Progress Tracker** section with:

```markdown
## Progress Tracker

| Step | Status | Notes |
|------|--------|-------|
| 0.1 | ⬜ NOT STARTED | |
| 0.2 | 🟡 IN PROGRESS | Working on X |
| 0.3 | ✅ COMPLETED | Verified working |
| 0.4 | ❌ BLOCKED | Issue: Y |
```

**Status Legend:**
- ⬜ `NOT STARTED` - Not yet begun
- 🟡 `IN PROGRESS` - Currently working
- ✅ `COMPLETED` - Done and verified
- ❌ `BLOCKED` - Has issues

**For Coding Agents:**
1. Read the phase document completely
2. Check the Progress Tracker for current status
3. Find the first `NOT STARTED` or `IN PROGRESS` step
4. Complete that step following instructions
5. Update the Progress Tracker status
6. Add notes if relevant
7. Continue to next step

---

## 6. Success Criteria (Full Project)

The project is complete when:

1. `docker compose up` starts the application
2. Frontend accessible at `http://localhost:3000`
3. API health check at `http://localhost:3000/api/health`
4. Can create providers, models, questions via API
5. Can trigger manual benchmark run
6. Benchmark executes and stores results
7. Rankings calculated automatically
8. Dashboard displays rankings and charts
9. Scheduled runs execute automatically
10. All TypeScript compiles without errors

---

## 7. Key Files Reference

| File | Purpose |
|------|---------|
| `plan/HIGH_LEVEL_DISCOVERY.md` | Original architecture decision |
| `plan/MASTER_PLAN.md` | This file - overview |
| `plan/PHASE_0_FOUNDATION.md` | Foundation setup |
| `plan/PHASE_1_BACKEND_CORE.md` | Backend core |
| `plan/PHASE_2_LLM_INTEGRATION.md` | LLM integration |
| `plan/PHASE_3_BENCHMARK_ENGINE.md` | Benchmark engine |
| `plan/PHASE_4_RANKING_SYSTEM.md` | Ranking system |
| `plan/PHASE_5_FRONTEND.md` | Frontend |
| `plan/PHASE_6_AUTOMATION.md` | Automation |

---

## 8. For Coding Agents

### Before Starting Any Phase:
1. Read `MASTER_PLAN.md` (this file) for context
2. Read the specific `PHASE_X_*.md` for detailed steps
3. Check the Progress Tracker in that phase
4. Understand what was completed in previous phases

### While Working:
1. Follow steps in order
2. Run verification commands after each step
3. Update Progress Tracker as you go
4. Keep notes about any issues

### After Completing a Step:
1. Mark step as ✅ COMPLETED
2. Add verification notes
3. Move to next step

### If Blocked:
1. Mark step as ❌ BLOCKED
2. Document the issue clearly
3. Note what was tried

---

## 9. Project Structure Target

```
benchmark/
├── app/
│   ├── shared/                 # Shared types & utilities
│   │   ├── types/
│   │   ├── schemas/
│   │   └── constants/
│   │
│   ├── server/                 # Express backend
│   │   ├── src/
│   │   │   ├── api/
│   │   │   ├── services/
│   │   │   ├── db/
│   │   │   ├── scheduler/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── client/                 # React frontend
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── stores/
│       │   └── App.tsx
│       ├── package.json
│       └── vite.config.ts
│
├── docker/
│   └── Dockerfile
│
├── data/                       # SQLite DB (gitignored)
│
├── plan/                       # Implementation plans
│
├── docker-compose.yml
├── package.json                # Workspace root
└── tsconfig.json               # Shared TS config
```

---

*Start with PHASE_0_FOUNDATION.md*
