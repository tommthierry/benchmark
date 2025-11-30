# Architecture

## Overview

Single Docker container monorepo with Express backend serving React frontend. Includes real-time SSE for the AI Arena.

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Container                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   React SPA     │    │      Express API                │ │
│  │   (Vite)        │◄──►│      + Static Server            │ │
│  └─────────────────┘    │      + SSE Endpoint             │ │
│                         └─────────────────────────────────┘ │
│                                   │                         │
│              ┌────────────────────┼────────────────────┐    │
│              │                    │                    │    │
│              ▼                    ▼                    ▼    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │   SQLite DB     │  │   Game Engine   │  │  OpenRouter │  │
│  │   (Drizzle)     │  │   + Scheduler   │  │  Provider   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
benchmark/
├── app/
│   ├── shared/          # @sabe/shared - Types, schemas
│   ├── server/          # Express API
│   │   ├── src/
│   │   │   ├── api/           # Route handlers
│   │   │   ├── db/            # Drizzle schema + connection
│   │   │   ├── services/      # Business logic
│   │   │   │   └── llm/       # LLM provider system
│   │   │   ├── middleware/    # SSE, error handling
│   │   │   ├── scheduler/     # node-cron scheduling
│   │   │   └── config/        # Configuration loaders
│   │   └── drizzle/           # Migrations
│   └── client/          # React SPA
│       └── src/
│           ├── pages/         # Route components
│           ├── components/    # Shared UI
│           │   └── arena/     # Arena-specific components
│           ├── hooks/         # Custom hooks (SSE, etc.)
│           ├── stores/        # Zustand state
│           ├── styles/        # Design tokens, animations
│           └── lib/           # API client
├── docker/
│   └── Dockerfile
├── data/                # SQLite (gitignored)
├── plan/                # Implementation phases
└── docs/                # Documentation
```

## Tech Stack

### Backend

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Node.js 20 | Server runtime |
| Framework | Express 5 | HTTP API |
| Language | TypeScript 5.9 | Type safety |
| Database | SQLite | Data storage |
| ORM | Drizzle | Type-safe queries |
| Validation | Zod | Schema validation |
| Logging | Pino | Structured logging |
| Scheduler | node-cron 4 | Task scheduling |
| Real-time | SSE | Server-Sent Events |

### Frontend

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 19 | UI library |
| Build | Vite 7 | Build tool |
| Styling | TailwindCSS 4 | Utility CSS |
| Data | TanStack Query 5 | Data fetching |
| State | Zustand 5 | UI state |
| Charts | ECharts | Visualizations |
| Animation | Framer Motion | Smooth transitions |
| Icons | Lucide React | Icon library |

## Key Services

### Game Engine

`app/server/src/services/game-engine.ts`

- Orchestrates AI Arena game flow
- Manages sessions, rounds, and steps
- Handles manual and automatic execution modes
- Emits events for real-time updates

### Event Bridge

`app/server/src/services/event-bridge.ts`

- Connects GameEngine events to SSE broadcast
- Manages connected clients
- Sends heartbeats to keep connections alive

### Provider Manager

`app/server/src/services/llm/provider-manager.ts`

- Manages LLM provider instances
- Registers providers from database config
- Routes requests to appropriate provider

### Prompt Builder

`app/server/src/services/prompt-builder.ts`

- Constructs prompts for arena game flow
- Templates for topic selection, question creation, answering, judging
- Response parsers with fallback handling

### Benchmark Runner

`app/server/src/services/benchmark-runner.ts`

- Orchestrates benchmark execution
- Executes model × question matrix
- Calculates costs from token usage

### Ranking Calculator

`app/server/src/services/ranking-calculator.ts`

- Global rankings across all questions
- Per-type rankings by category
- Delta calculations vs previous run

## Data Flow

### Arena Game Flow

```
1. POST /api/arena/sessions
   └─► Create game_sessions record

2. POST /api/arena/trigger (repeat until session complete)
   └─► Game Engine determines next step
   └─► Execute step (topic, question, answer, or judge)
   └─► Store in round_steps
   └─► Emit SSE event to all connected clients
   └─► Store judgments in model_judgments
   └─► Calculate scores on round completion

3. Frontend receives SSE events
   └─► Update arena visualization
   └─► Show real-time activity feed
```

### Benchmark Execution

```
1. POST /api/runs
   └─► Create benchmark_runs record

2. For each model × question:
   └─► Create task_executions record
   └─► Call LLM provider
   └─► Store response + metadata
   └─► Run evaluator
   └─► Create evaluations record

3. On completion:
   └─► Calculate rankings
   └─► Create rankings records
```

## Real-time Architecture

### SSE Flow

```
┌──────────┐     GET /api/arena/events     ┌──────────────┐
│  Client  │──────────────────────────────►│ SSE Endpoint │
│  (Arena) │                               └──────────────┘
│          │                                      │
│          │◄─────── state_snapshot ──────────────┤
│          │                                      │
│          │◄─────── session:created ─────────────┤
│          │◄─────── round:started ───────────────┤
│          │◄─────── step:started ────────────────┤
│          │◄─────── step:completed ──────────────┤
│          │◄─────── round:completed ─────────────┤
│          │◄─────── heartbeat ───────────────────┤
└──────────┘                                      │
     ▲                                            │
     │                                     ┌──────┴───────┐
     │                                     │ Event Bridge │
     │                                     └──────┬───────┘
     │                                            │
     │                                     ┌──────┴───────┐
     └─────────────────────────────────────│ Game Engine  │
                                           └──────────────┘
```

## Design Decisions

### SQLite over PostgreSQL

- ~1000 runs/year max scale
- Zero configuration
- Single file, easy backup
- Drizzle makes migration trivial if needed

### Single Container

- Express serves API + static files
- Scheduler runs in-process
- One thing to deploy and monitor

### SSE over WebSocket

- Unidirectional flow matches our use case
- Built-in browser reconnection
- Works over standard HTTP/2
- Simpler implementation

### Admin-First

- All entities manageable via UI
- Full CRUD APIs
- No need for database access
