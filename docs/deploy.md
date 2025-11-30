# Deployment Guide

## Prerequisites

- Docker and Docker Compose
- OpenRouter API key ([get one here](https://openrouter.ai/keys))

## Quick Deploy (Docker)

```bash
# 1. Clone the repository
git clone <repo-url>
cd benchmark

# 2. Create environment file
cp app/server/.env.sample .env

# 3. Edit .env with your settings
# Required: OPENROUTER_API_KEY=sk-or-v1-...

# 4. Build and start
docker compose up -d

# 5. Verify
curl http://localhost:3000/api/health
```

Access the dashboard at `http://localhost:3000`

Access the public arena at `http://localhost:3000/arena`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | Yes | - | OpenRouter API key |
| `PORT` | No | 3000 | Server port |
| `LOG_LEVEL` | No | info | Log level (debug, info, warn, error) |
| `NODE_ENV` | No | production | Environment mode |

### Scheduler Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SCHEDULE_WEEKLY_ENABLED` | true | Enable weekly benchmarks |
| `SCHEDULE_WEEKLY_CRON` | `0 2 * * 1` | Weekly cron (Mon 2 AM) |
| `SCHEDULE_MONTHLY_ENABLED` | true | Enable monthly benchmarks |
| `SCHEDULE_MONTHLY_CRON` | `0 3 1 * *` | Monthly cron (1st at 3 AM) |
| `TZ` | UTC | Timezone |

### LLM-as-Judge Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_JUDGE_PROVIDER_ID` | - | Provider UUID for judge model |
| `LLM_JUDGE_MODEL` | anthropic/claude-3.5-sonnet | Judge model |

## Docker Compose Reference

```yaml
services:
  sabe:
    build:
      context: .
      dockerfile: docker/Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - sabe-data:/app/data  # Persist SQLite
    environment:
      - NODE_ENV=production
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Data Persistence

SQLite database is stored in `/app/data/sabe.db` inside the container.

The `sabe-data` volume ensures data persists across container restarts.

### Backup

```bash
# Backup database
docker compose exec sabe cp /app/data/sabe.db /app/data/backup.db
docker compose cp sabe:/app/data/backup.db ./backup.db

# Restore
docker compose cp ./backup.db sabe:/app/data/sabe.db
docker compose restart
```

## Development Setup

```bash
# Install dependencies
npm install

# Build shared package first
npm run build:shared

# Start backend (port 3000)
npm run dev

# Start frontend (port 5173)
npm run dev:client
```

## Post-Deployment Setup

### 1. Create Provider

Via Admin UI (`/admin/providers`) or API:

```bash
curl -X POST http://localhost:3000/api/providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenRouter",
    "apiEndpoint": "https://openrouter.ai/api/v1",
    "apiKeyEnvVar": "OPENROUTER_API_KEY"
  }'
```

### 2. Import Models

1. Go to Admin UI -> Models -> Import from Provider
2. Select models to benchmark
3. Toggle status to "active"

### 3. Create Question Types

1. Go to Admin UI -> Question Types
2. Add categories (e.g., "Reasoning", "Code", "Knowledge")

### 4. Create Questions

1. Go to Admin UI -> Questions
2. Add questions with evaluation criteria

### 5. Run First Arena Session

Via API (Manual Mode):

```bash
# Create session
curl -X POST http://localhost:3000/api/arena/sessions \
  -H "Content-Type: application/json" \
  -d '{"totalRounds": 3}'

# Trigger steps (repeat until session completes)
curl -X POST http://localhost:3000/api/arena/trigger

# Watch in browser at http://localhost:3000/arena
```

Via API (Automatic Mode):

```bash
# Create and start session
curl -X POST http://localhost:3000/api/arena/sessions \
  -H "Content-Type: application/json" \
  -d '{"totalRounds": 3}'

# Get session ID from response and start it
curl -X POST http://localhost:3000/api/arena/sessions/<session-id>/start
```

### 6. Run a Benchmark (Optional)

```bash
curl -X POST http://localhost:3000/api/runs
```

## Monitoring

```bash
# View logs
docker compose logs -f

# Check health
curl http://localhost:3000/api/health

# Scheduler status
curl http://localhost:3000/api/schedule

# Arena SSE connections
curl http://localhost:3000/api/arena/events/status
```

## Troubleshooting

### Container won't start

```bash
docker compose logs sabe
```

### Database issues

```bash
# Reset database (WARNING: deletes all data)
docker compose down -v
docker compose up -d
```

### Port conflict

Change port in docker-compose.yml or:

```bash
PORT=3001 docker compose up -d
```

### SSE not connecting

- Check browser console for CORS errors
- Ensure you're accessing via the correct port
- Verify the server is running: `curl http://localhost:3000/api/health`
