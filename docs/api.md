# API Reference

Base URL: `http://localhost:3000/api`

All responses follow: `{ data: ... }` or `{ error: string, details?: ... }`

## Health

```
GET /health
```

Returns server status and version.

## Providers

```
GET    /providers          # List all
POST   /providers          # Create
GET    /providers/:id      # Get one
PUT    /providers/:id      # Update
DELETE /providers/:id      # Delete
```

**Create/Update body:**
```json
{
  "name": "OpenRouter",
  "apiEndpoint": "https://openrouter.ai/api/v1",
  "apiKeyEnvVar": "OPENROUTER_API_KEY",
  "status": "active",
  "rateLimitPerMinute": 60
}
```

## Models

```
GET    /models             # List (filter: ?providerId=&status=)
POST   /models             # Create
GET    /models/:id         # Get one
PUT    /models/:id         # Update
DELETE /models/:id         # Delete
PATCH  /models/:id/status  # Toggle status
```

**Create/Update body:**
```json
{
  "providerId": "uuid",
  "providerModelId": "anthropic/claude-3.5-sonnet",
  "displayName": "Claude 3.5 Sonnet",
  "status": "active",
  "contextSize": 200000,
  "costInputPerMillion": 3.00,
  "costOutputPerMillion": 15.00
}
```

## Questions

```
GET    /questions          # List (filter: ?typeId=&status=)
POST   /questions          # Create
GET    /questions/:id      # Get one
PUT    /questions/:id      # Update
DELETE /questions/:id      # Delete
GET    /questions/types    # List types
POST   /questions/types    # Create type
PUT    /questions/types/:id # Update type
DELETE /questions/types/:id # Delete type
```

**Create question body:**
```json
{
  "typeId": "uuid",
  "content": "What is 2+2?",
  "expectedAnswer": "4",
  "evaluationMethod": "exact_match",
  "evaluationCriteria": {
    "pattern": "\\d+",
    "keywords": ["four", "4"],
    "rubric": "Must provide correct answer"
  },
  "difficulty": "easy",
  "weight": 1.0
}
```

## Runs (Benchmarks)

```
GET    /runs               # List all
POST   /runs               # Start new
GET    /runs/:id           # Get details
GET    /runs/:id/progress  # Get progress
GET    /runs/:id/summary   # Get summary stats
GET    /runs/:id/results   # Get results + evaluations
POST   /runs/:id/cancel    # Cancel running
```

**Start run body (all optional):**
```json
{
  "modelIds": ["uuid1", "uuid2"],
  "questionIds": ["uuid1"],
  "config": {
    "temperature": 0.7,
    "maxTokens": 1000
  }
}
```

## Rankings

```
GET /rankings/latest              # Latest global rankings
GET /rankings/types               # Available question types
GET /rankings/by-type/:type       # Rankings for type
GET /rankings/compare/:period     # Temporal (wow, mom, qoq, yoy)
GET /rankings/history/:modelId    # Model history
GET /rankings/trends              # All models trends
GET /rankings/run/:runId          # Rankings for specific run
```

## LLM

```
GET  /llm/status                  # All provider statuses
GET  /llm/providers/:id/test      # Test connectivity
GET  /llm/providers/:id/models    # List available models
POST /llm/test                    # Send test prompt
POST /llm/providers/:id/reload    # Reload after config change
```

## Schedule

```
GET    /schedule                  # Get status
POST   /schedule/start            # Start scheduler
POST   /schedule/stop             # Stop scheduler
PUT    /schedule                  # Update config
POST   /schedule/trigger/:type    # Trigger run (weekly/monthly)
GET    /schedule/validate?cron=   # Validate cron expression
```

## Config

```
GET /config                       # Get execution config
PUT /config                       # Update execution config
```

**Update body:**
```json
{
  "executionMode": "manual",
  "cronExpression": "0 2 * * 1",
  "timezone": "UTC",
  "autoStartEnabled": false,
  "roundsPerSession": 5,
  "stepDelayMs": 2000
}
```

## Arena (AI Arena)

### Sessions

```
GET    /arena/sessions            # List all sessions
POST   /arena/sessions            # Create new session
GET    /arena/sessions/:id        # Get session with rounds
POST   /arena/sessions/:id/start  # Start automatic mode
POST   /arena/sessions/:id/pause  # Pause session
```

**Create session body:**
```json
{
  "totalRounds": 5,
  "modelIds": ["uuid1", "uuid2"],
  "stepDelayMs": 2000
}
```

### Manual Mode

```
POST /arena/trigger               # Execute next step
```

**Trigger body (optional):**
```json
{
  "sessionId": "uuid"
}
```

### State

```
GET /arena/current                # Current game state for display
```

**Response:**
```json
{
  "data": {
    "session": {
      "id": "uuid",
      "status": "running",
      "totalRounds": 5,
      "completedRounds": 2,
      "currentRoundId": "uuid"
    },
    "currentRound": {
      "id": "uuid",
      "roundNumber": 3,
      "status": "answering",
      "masterId": "uuid",
      "masterName": "GPT-4",
      "topicName": "Reasoning",
      "questionContent": "..."
    },
    "currentStep": {
      "id": "uuid",
      "stepType": "model_answer",
      "actorModelId": "uuid"
    },
    "models": [
      {
        "id": "uuid",
        "displayName": "Claude 3.5",
        "status": "answered",
        "hasAnswered": true,
        "hasJudged": false
      }
    ]
  }
}
```

### Rounds

```
GET /arena/rounds/:id             # Round details with steps
GET /arena/rounds/:id/scores      # Round scores/rankings
GET /arena/rounds/:roundId/models/:modelId  # Model detail for round
```

### SSE Events

```
GET /arena/events                 # SSE stream for real-time updates
GET /arena/events/status          # Connected client count
```

**Event types:**
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

**Connecting to SSE:**
```javascript
const eventSource = new EventSource('/api/arena/events');

eventSource.addEventListener('state_snapshot', (e) => {
  const state = JSON.parse(e.data);
  console.log('Current state:', state);
});

eventSource.addEventListener('step:completed', (e) => {
  const step = JSON.parse(e.data);
  console.log('Step completed:', step);
});
```

## Error Responses

```json
{
  "error": "Validation failed",
  "details": {
    "fieldErrors": {
      "name": ["Required"]
    }
  }
}
```

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 204 | Deleted (no content) |
| 400 | Validation error |
| 404 | Not found |
| 500 | Server error |
