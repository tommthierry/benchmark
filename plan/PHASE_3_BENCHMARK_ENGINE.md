# PHASE 3: Benchmark Engine

**Status:** ✅ COMPLETED
**Goal:** Execute benchmarks, store responses, and evaluate results
**Completed:** 2025-11-29
**Prerequisites:** Phase 2 completed

---

## Phase Objectives

By the end of this phase:
1. ✅ Benchmark runner service orchestrating execution
2. ✅ Task execution pipeline (model × question)
3. ✅ Rule-based evaluators (exact, contains, regex)
4. ✅ Response storage with full metadata
5. ✅ API to trigger and monitor benchmark runs

---

## Progress Tracker

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 3.1 | Create benchmark types in shared package | ✅ COMPLETED | `app/shared/src/types/benchmark.ts` |
| 3.2 | Create benchmark Zod schemas | ✅ COMPLETED | `app/shared/src/schemas/benchmark.ts` |
| 3.3 | Create rule-based evaluator service | ✅ COMPLETED | `app/server/src/services/evaluator.ts` |
| 3.4 | Create benchmark runner service | ✅ COMPLETED | `app/server/src/services/benchmark-runner.ts` |
| 3.5 | Add benchmark API endpoints | ✅ COMPLETED | `app/server/src/api/runs.ts` |
| 3.6 | Integrate routes into Express server | ✅ COMPLETED | Updated `index.ts` |
| 3.7 | Test complete benchmark flow | ✅ COMPLETED | All evaluators verified |

---

## What Was Implemented

### Shared Package (`app/shared/src/`)

**New Types (`types/benchmark.ts`):**
- `BenchmarkRunOptions` - Options for starting a run
- `BenchmarkProgress` - Real-time progress info
- `BenchmarkRunStatus` - Run status enum
- `TaskExecutionStatus` - Task status enum
- `EvaluatorType` - Evaluator type enum
- `EvaluationResult` - Evaluation outcome
- `TaskExecutionResult` - Execution with evaluation
- `BenchmarkRunSummary` - Summary statistics

**New Schemas (`schemas/benchmark.ts`):**
- `startBenchmarkRunSchema` - Validate run start request
- `benchmarkRunQuerySchema` - Query params validation
- `runIdParamSchema` - UUID param validation

### Server Package (`app/server/src/services/`)

**Evaluator Service (`evaluator.ts`):**
- `Evaluator` class with three evaluation methods
- `evaluateExactMatch()` - Full match = 100, partial = 75, none = 0
- `evaluateContains()` - Score proportional to keywords found
- `evaluateRegex()` - Pattern match = 100, no match = 0
- Text normalization (lowercase, whitespace, punctuation)
- Automatic evaluation record creation
- `getEvaluator()` - Singleton accessor

**Benchmark Runner Service (`benchmark-runner.ts`):**
- `BenchmarkRunner` class orchestrating execution
- Async run execution (returns immediately with runId)
- Model × Question matrix execution
- Provider manager integration for LLM calls
- Cost calculation from model pricing
- Progress tracking with task counts
- Run cancellation support
- Summary statistics calculation
- `getBenchmarkRunner()` - Singleton accessor

### API Routes (`app/server/src/api/runs.ts`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/runs` | GET | List runs with pagination |
| `/api/runs` | POST | Start new benchmark run |
| `/api/runs/:id` | GET | Get run details |
| `/api/runs/:id/progress` | GET | Get real-time progress |
| `/api/runs/:id/summary` | GET | Get summary statistics |
| `/api/runs/:id/results` | GET | Get results with evaluations |
| `/api/runs/:id/cancel` | POST | Cancel running benchmark |

---

## File Structure Created

```
app/
├── shared/src/
│   ├── types/
│   │   └── benchmark.ts          # Benchmark type definitions
│   ├── schemas/
│   │   ├── benchmark.ts          # Zod validation schemas
│   │   └── index.ts              # Updated exports
│   └── index.ts                  # Updated exports
│
└── server/src/
    ├── services/
    │   ├── evaluator.ts          # Rule-based evaluator
    │   └── benchmark-runner.ts   # Run orchestration
    ├── api/
    │   └── runs.ts               # Runs API routes
    └── index.ts                  # Updated with runs routes
```

---

## Usage Examples

### Start a Benchmark Run
```bash
# Run all active models against all active questions
curl -X POST http://localhost:3000/api/runs \
  -H "Content-Type: application/json" \
  -d '{}'

# Response: {"message":"Benchmark run started","runId":"uuid"}
```

### Run with Specific Models/Questions
```bash
curl -X POST http://localhost:3000/api/runs \
  -H "Content-Type: application/json" \
  -d '{
    "modelIds": ["model-uuid-1", "model-uuid-2"],
    "questionIds": ["question-uuid-1"],
    "config": {
      "temperature": 0.5,
      "maxTokens": 500
    }
  }'
```

### Monitor Progress
```bash
curl http://localhost:3000/api/runs/{runId}/progress

# Response:
{
  "data": {
    "runId": "uuid",
    "status": "running",
    "totalTasks": 10,
    "completedTasks": 4,
    "successfulTasks": 4,
    "failedTasks": 0,
    "progress": 40,
    "startedAt": "2025-11-29T01:19:17.000Z"
  }
}
```

### Get Results
```bash
curl http://localhost:3000/api/runs/{runId}/results

# Returns all task executions with their evaluations
```

### Get Summary
```bash
curl http://localhost:3000/api/runs/{runId}/summary

# Response:
{
  "data": {
    "runId": "uuid",
    "iterationNumber": 3,
    "status": "completed",
    "modelsCount": 1,
    "questionsCount": 3,
    "totalTasks": 3,
    "successfulTasks": 3,
    "failedTasks": 0,
    "averageScore": 100,
    "totalCost": 0,
    "totalTokensInput": 502,
    "totalTokensOutput": 549,
    "averageResponseTimeMs": 182,
    "durationMs": 8000
  }
}
```

### Cancel a Running Benchmark
```bash
curl -X POST http://localhost:3000/api/runs/{runId}/cancel
```

---

## Evaluation Methods

### 1. Exact Match (`exact_match`)
Compares normalized response to expected answer.
- **100 points**: Exact match after normalization
- **75 points**: Expected answer found within response
- **0 points**: No match

**Question setup:**
```json
{
  "evaluationMethod": "exact_match",
  "expectedAnswer": "Paris"
}
```

### 2. Contains Keywords (`contains`)
Checks for presence of required keywords.
- Score = (matched keywords / total keywords) × 100

**Question setup:**
```json
{
  "evaluationMethod": "contains",
  "evaluationCriteria": {
    "keywords": ["red", "green", "blue"]
  }
}
```

### 3. Regex Pattern (`regex`)
Matches response against regex pattern.
- **100 points**: Pattern found
- **0 points**: Pattern not found

**Question setup:**
```json
{
  "evaluationMethod": "regex",
  "evaluationCriteria": {
    "pattern": "\\d{4}"
  }
}
```

### 4. LLM Judge (`llm_judge`)
Placeholder for Phase 6. Currently returns 0 with a note.

---

## Verification Checklist

- [x] Benchmark runner creates run record
- [x] Task executions created for each model × question
- [x] LLM calls succeed and responses stored
- [x] Token counts and costs calculated
- [x] Exact match evaluator works
- [x] Contains evaluator works with keywords
- [x] Regex evaluator works with patterns
- [x] Run progress shows correct counts
- [x] Run status transitions: pending → running → completed
- [x] Failed tasks marked correctly
- [x] Results endpoint returns executions with evaluations
- [x] Summary endpoint returns statistics
- [x] Cancel endpoint stops running benchmark

---

## Technical Decisions

1. **Async Execution** - Runs start immediately, execution happens in background
2. **Sequential Tasks** - Tasks execute one at a time to respect rate limits
3. **Cancellation Support** - Active runs tracked in memory for quick cancellation
4. **Cost Calculation** - Uses model's per-million pricing from database
5. **Singleton Services** - Evaluator and Runner use singleton pattern
6. **Text Normalization** - Lowercase, trim, normalize whitespace, remove punctuation

---

## Next Phase

Phase 3 is complete. Proceed to:
**→ PHASE_4_RANKING_SYSTEM.md**

The next phase will:
- Calculate rankings from evaluation scores
- Implement global and by-type rankings
- Track position changes (deltas)
- Add ranking API endpoints

---

## Troubleshooting

### "No active models found"
- Create at least one model with status 'active'
- Ensure model's providerId references valid provider
- Check provider API key is configured

### "No active questions found"
- Create at least one question with status 'active'
- Ensure question's typeId references valid question type

### LLM calls failing
- Check provider API key in environment
- Verify provider is registered (`/api/llm/status`)
- Check rate limits haven't been exceeded
- Review server logs for detailed errors

### Evaluations not created
- Check question has valid evaluationMethod
- For 'contains', ensure keywords array is provided
- For 'regex', ensure pattern is valid
- Check server logs for evaluation errors

### Run stuck in 'running'
- Check server logs for errors
- Use cancel endpoint to stop: `POST /api/runs/{id}/cancel`
- Restart server if needed (runs tracked in memory)
