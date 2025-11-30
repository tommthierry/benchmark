# SABE

**Systeme Autonome de Benchmarking Evolutif** - Autonomous LLM benchmarking platform with a real-time AI Arena.

## AI Arena

Watch AI models compete in real-time:

- **Turn-based competition**: Each model takes turns as the "Master" who creates questions
- **Peer judging**: All models judge each other's answers
- **Real-time updates**: SSE-powered live visualization
- **Public viewing**: Anyone can watch at `/arena`

```
ROUND FLOW:
┌───────────────────────────────────────────┐
│  1. Master creates a question             │
│  2. Other models answer sequentially      │
│  3. All models judge each other           │
│  4. Scores aggregated (Master breaks ties)│
│  5. Next model becomes Master             │
└───────────────────────────────────────────┘
```

## Features

- **AI Arena** - Real-time LLM competition with peer judging
- **Scheduled benchmarks** - Weekly/monthly automated runs
- **Multiple providers** - OpenRouter integration
- **Dual evaluation** - Rule-based + LLM-as-Judge
- **Rankings** - Global and per-category with trends
- **React dashboard** - Admin UI + public arena view

## Quick Start

```bash
# Configure
cp app/server/.env.sample .env
# Edit .env with your OPENROUTER_API_KEY

# Run
docker compose up -d

# Access
open http://localhost:3000        # Dashboard
open http://localhost:3000/arena  # Public Arena
```

## Running the Arena

```bash
# Create an arena session (3 rounds)
curl -X POST http://localhost:3000/api/arena/sessions \
  -H "Content-Type: application/json" \
  -d '{"totalRounds": 3}'

# Trigger steps manually (repeat until complete)
curl -X POST http://localhost:3000/api/arena/trigger

# Or start automatic mode
curl -X POST http://localhost:3000/api/arena/sessions/<id>/start

# Watch live at http://localhost:3000/arena
```

## Development

```bash
npm install
npm run build:shared
npm run dev          # Backend :3000
npm run dev:client   # Frontend :5173
```

## Documentation

- [Project Overview](docs/project.md)
- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [Database Schema](docs/db.md)
- [Deployment Guide](docs/deploy.md)

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js 20, Express 5, Drizzle ORM, SQLite |
| **Frontend** | React 19, Vite 7, TailwindCSS 4, TanStack Query |
| **Real-time** | Server-Sent Events (SSE) |
| **Animation** | Framer Motion |
| **Infra** | Docker, node-cron |

## Project Structure

```
benchmark/
├── app/
│   ├── shared/      # @sabe/shared - Types, schemas
│   ├── server/      # Express API + SSE
│   └── client/      # React SPA + Arena UI
├── docs/            # Documentation
├── plan/            # Implementation phases
└── data/            # SQLite database
```

## API Highlights

| Endpoint | Description |
|----------|-------------|
| `GET /api/arena/events` | SSE stream for real-time updates |
| `POST /api/arena/sessions` | Create new arena session |
| `POST /api/arena/trigger` | Execute next step (manual mode) |
| `GET /api/arena/current` | Current game state |
| `GET /api/rankings/latest` | Model rankings |

## License

MIT
