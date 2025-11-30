# PHASE 6: Automation

**Status:** ✅ COMPLETED
**Goal:** Full autonomous operation with scheduled runs and LLM-as-Judge
**Completed:** 2025-11-29
**Prerequisites:** Phase 5 completed

---

## Phase Objectives

By the end of this phase:
1. ✅ node-cron scheduler running weekly/monthly benchmarks
2. ✅ LLM-as-Judge evaluation for complex questions
3. ✅ Run status monitoring and error logging
4. ✅ Graceful shutdown handling
5. ✅ Configuration for schedule management
6. ✅ Full autonomous operation verified

---

## Progress Tracker

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 6.1 | Install scheduler dependencies | ✅ COMPLETED | node-cron ^4.2.1 |
| 6.2 | Create scheduler service | ✅ COMPLETED | `app/server/src/scheduler/index.ts` |
| 6.3 | Add schedule configuration | ✅ COMPLETED | `app/server/src/config/schedule.ts` |
| 6.4 | Implement LLM-as-Judge evaluator | ✅ COMPLETED | Updated `evaluator.ts` |
| 6.5 | Add graceful shutdown | ✅ COMPLETED | Updated `index.ts` |
| 6.6 | Create schedule API endpoints | ✅ COMPLETED | `app/server/src/api/schedule.ts` |
| 6.7 | Test autonomous operation | ✅ COMPLETED | All endpoints verified |

---

## What Was Implemented

### Files Created

| File | Purpose |
|------|---------|
| `app/server/src/scheduler/index.ts` | Scheduler service with Scheduler class |
| `app/server/src/config/schedule.ts` | Schedule configuration loader |
| `app/server/src/api/schedule.ts` | Schedule API endpoints |

### Files Modified

| File | Changes |
|------|---------|
| `app/server/package.json` | Added node-cron ^4.2.1, @types/node-cron |
| `app/server/src/index.ts` | Added graceful shutdown, scheduler startup |
| `app/server/src/services/evaluator.ts` | Added LLM-as-Judge implementation |

---

## Scheduler Service

**Location:** `app/server/src/scheduler/index.ts`

The scheduler uses node-cron v4.x for cron-like task scheduling.

### Features

- Weekly and monthly benchmark schedules
- Configurable via environment variables
- Graceful shutdown on SIGTERM/SIGINT
- Concurrent run protection (skips if run already in progress)
- Next run time calculation via `getNextRun()`

### Key Methods

| Method | Description |
|--------|-------------|
| `start()` | Start the scheduler with configured schedules |
| `stop()` | Stop all scheduled tasks |
| `getStatus()` | Get current status, tasks, and next run times |
| `updateConfig()` | Update schedule configuration |
| `triggerRun(type)` | Manually trigger a weekly/monthly run |

---

## Schedule Configuration

**Location:** `app/server/src/config/schedule.ts`

Configuration is loaded from environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `SCHEDULE_WEEKLY_ENABLED` | `true` | Enable weekly benchmarks |
| `SCHEDULE_WEEKLY_CRON` | `0 2 * * 1` | Weekly cron (Monday 2 AM) |
| `SCHEDULE_MONTHLY_ENABLED` | `true` | Enable monthly benchmarks |
| `SCHEDULE_MONTHLY_CRON` | `0 3 1 * *` | Monthly cron (1st at 3 AM) |
| `TZ` | `UTC` | Timezone for scheduling |

---

## LLM-as-Judge Evaluation

**Location:** `app/server/src/services/evaluator.ts`

The evaluator now supports LLM-as-Judge for questions with `evaluationMethod: 'llm_judge'`.

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_JUDGE_PROVIDER_ID` | - | Provider UUID for judge model |
| `LLM_JUDGE_MODEL` | `anthropic/claude-3.5-sonnet` | Model to use as judge |

### How It Works

1. Checks if `LLM_JUDGE_PROVIDER_ID` is configured
2. Builds evaluation prompt with question and response
3. Uses custom rubric from `evaluationCriteria.rubric` or default
4. Sends prompt to judge model with low temperature (0.1)
5. Parses JSON response for score and justification
6. Falls back to score 50 on errors

### Judge Prompt Format

```
You are an expert evaluator judging AI model responses.

## Question Asked:
{question.content}

## Response to Evaluate:
{response}

## Evaluation Rubric:
{rubric or default}

## Instructions:
Score the response from 0-100 based on the rubric above.
Respond in JSON format: {"score": <0-100>, "justification": "<explanation>"}
```

---

## Schedule API Endpoints

**Location:** `app/server/src/api/schedule.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/schedule` | GET | Get scheduler status |
| `/api/schedule/start` | POST | Start scheduler |
| `/api/schedule/stop` | POST | Stop scheduler |
| `/api/schedule` | PUT | Update schedule config |
| `/api/schedule/trigger/:type` | POST | Trigger manual run |
| `/api/schedule/validate` | GET | Validate cron expression |

### Response Format

```json
{
  "data": {
    "isRunning": true,
    "tasks": ["weekly", "monthly"],
    "config": {
      "weekly": { "enabled": true, "cron": "0 2 * * 1" },
      "monthly": { "enabled": true, "cron": "0 3 1 * *" }
    },
    "nextRuns": {
      "weekly": "2025-12-01T02:00:00.000Z",
      "monthly": "2025-12-01T03:00:00.000Z"
    }
  }
}
```

---

## Graceful Shutdown

**Location:** `app/server/src/index.ts`

The server handles graceful shutdown on:
- `SIGTERM` - Container stop signal
- `SIGINT` - Ctrl+C in terminal
- Uncaught exceptions

### Shutdown Sequence

1. Set `isShuttingDown` flag (health check returns 503)
2. Stop scheduler (cancels pending tasks)
3. Wait for HTTP server to close (10s timeout)
4. Exit process

---

## Usage Examples

### Check Scheduler Status
```bash
curl http://localhost:3000/api/schedule
```

### Start/Stop Scheduler
```bash
curl -X POST http://localhost:3000/api/schedule/start
curl -X POST http://localhost:3000/api/schedule/stop
```

### Update Schedule
```bash
curl -X PUT http://localhost:3000/api/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "weekly": { "enabled": true, "cron": "0 3 * * 1" },
    "monthly": { "enabled": false }
  }'
```

### Manually Trigger Run
```bash
curl -X POST http://localhost:3000/api/schedule/trigger/weekly
```

### Validate Cron Expression
```bash
curl "http://localhost:3000/api/schedule/validate?cron=0%202%20*%20*%201"
```

### Configure LLM-as-Judge

1. Get your provider ID:
```bash
curl http://localhost:3000/api/providers
```

2. Add to `.env`:
```env
LLM_JUDGE_PROVIDER_ID=your-provider-uuid
LLM_JUDGE_MODEL=anthropic/claude-3.5-sonnet
```

3. Create question with LLM judge:
```bash
curl -X POST http://localhost:3000/api/questions \
  -H "Content-Type: application/json" \
  -d '{
    "typeId": "type-uuid",
    "content": "Explain recursion in programming",
    "evaluationMethod": "llm_judge",
    "evaluationCriteria": {
      "rubric": "Score based on clarity, accuracy, and use of examples"
    }
  }'
```

---

## Verification Checklist

- [x] Scheduler starts with server
- [x] Weekly schedule registered
- [x] Monthly schedule registered
- [x] `/api/schedule` returns status
- [x] Manual trigger works
- [x] Schedule can be updated via API
- [x] LLM-as-Judge evaluates questions (when configured)
- [x] Graceful shutdown stops scheduler
- [x] Graceful shutdown waits for requests
- [x] Logs show shutdown sequence
- [x] Build succeeds without errors

---

## Technical Decisions

### node-cron v4.x

We use node-cron version 4.2.1, which has a different API from v3.x:
- `schedule()` auto-starts tasks (no `scheduled: true` option)
- `TaskOptions` only includes: `timezone`, `name`, `noOverlap`, `maxExecutions`
- Tasks have `getNextRun()` method for calculating next execution

### LLM Judge Fallback

When LLM Judge is not configured or fails:
- Returns score of 50 (neutral)
- Logs warning with reason
- Does not fail the evaluation

### Concurrent Run Protection

The scheduler checks for running benchmarks before starting new ones:
- Queries `benchmarkRuns` for `status = 'running'`
- Skips scheduled run if one is in progress
- Logs warning with running run ID

---

## Project Complete!

All 6 phases have been implemented. SABE is now a fully autonomous LLM benchmarking platform.

### Summary

| Phase | Status | Description |
|-------|--------|-------------|
| 0 | ✅ | Foundation - Docker, structure |
| 1 | ✅ | Backend Core - DB, APIs |
| 2 | ✅ | LLM Integration - OpenRouter, retry |
| 3 | ✅ | Benchmark Engine - Runner, evaluator |
| 4 | ✅ | Ranking System - Calculator, temporal |
| 5 | ✅ | Frontend - React dashboard |
| 6 | ✅ | Automation - Scheduler, LLM Judge |

### To Deploy

```bash
docker compose build
docker compose up -d
```

### To Configure Automation

1. Set environment variables in `.env`
2. Create providers and models
3. Create questions with evaluation methods
4. Scheduler will run weekly/monthly benchmarks automatically
