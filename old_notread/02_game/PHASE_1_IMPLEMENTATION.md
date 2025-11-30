# Phase 1: Game Engine Implementation Plan

## Overview

This document outlines the implementation approach for Phase 1 of the AI Arena project. The Game Engine is the core system that orchestrates the competition flow between LLM models.

## Key Concepts

### Terminology
- **Session**: A complete game containing multiple rounds
- **Round**: One cycle: master selection → question → answers → judging → scoring
- **Step**: Single atomic action within a round (one LLM interaction)
- **Master**: The LLM who creates the question for the round
- **Participant**: Non-master LLMs who answer the question

### Step Types
1. `master_topic` - Master selects a topic from available question types
2. `master_question` - Master generates a question on the selected topic
3. `model_answer` - A participant answers the question
4. `model_judge` - A model judges all other answers
5. `scoring` - Final score calculation for the round

## Implementation Order

### 1. Database Schema (schema.ts)

Add 4 new tables:
- `game_sessions` - Session tracking
- `rounds` - Individual rounds within sessions
- `round_steps` - Atomic steps within rounds
- `model_judgments` - Peer evaluation records

### 2. Shared Types (app/shared)

Create `types/game.ts` with:
- Session status enum
- Round status enum
- Step types enum
- Game event types for SSE (Phase 2)

### 3. GameEngine Service

Core service pattern following `BenchmarkRunner`:
- Singleton pattern with `getGameEngine()`
- EventEmitter for real-time events
- State machine for round/step progression
- Pause/resume capability
- Manual step execution for "manual mode"

### 4. Arena API Endpoints

New router at `/api/arena`:
- `GET /sessions` - List sessions
- `POST /sessions` - Create session
- `POST /sessions/:id/start` - Start session (cron mode)
- `POST /sessions/:id/pause` - Pause session
- `POST /trigger` - Execute next step (manual mode)
- `GET /current` - Get current game state
- `GET /rounds/:id` - Get round details

## Database Schema Design

### game_sessions
```sql
id TEXT PRIMARY KEY
status TEXT (created, running, paused, completed, failed)
total_rounds INTEGER
completed_rounds INTEGER
current_round_id TEXT (FK to rounds)
participating_model_ids TEXT (JSON array)
config TEXT (JSON - stepDelayMs, etc.)
started_at INTEGER
completed_at INTEGER
created_at INTEGER
```

### rounds
```sql
id TEXT PRIMARY KEY
session_id TEXT (FK to game_sessions)
round_number INTEGER
status TEXT (created, topic_selection, question_creation, answering, judging, scoring, completed, failed)
master_id TEXT (FK to models)
topic_id TEXT (FK to question_types)
question_content TEXT
question_difficulty TEXT (easy, medium, hard, expert)
started_at INTEGER
completed_at INTEGER
created_at INTEGER
```

### round_steps
```sql
id TEXT PRIMARY KEY
round_id TEXT (FK to rounds)
step_number INTEGER
step_type TEXT (master_topic, master_question, model_answer, model_judge, scoring)
status TEXT (pending, running, completed, failed, skipped)
actor_model_id TEXT (FK to models) - who performs this step
target_model_id TEXT (FK to models) - for judging, who is being judged
input_data TEXT (JSON)
output_data TEXT (JSON)
llm_response_time_ms INTEGER
llm_tokens_used INTEGER
error_message TEXT
started_at INTEGER
completed_at INTEGER
created_at INTEGER
```

### model_judgments
```sql
id TEXT PRIMARY KEY
round_id TEXT (FK to rounds)
step_id TEXT (FK to round_steps)
judge_model_id TEXT (FK to models)
target_model_id TEXT (FK to models)
score REAL (0-100)
rank INTEGER (position given by this judge)
reasoning TEXT
criteria_scores TEXT (JSON - accuracy, clarity, etc.)
is_master_judgment INTEGER (boolean - for tiebreaker)
created_at INTEGER
```

## Prompt Templates

### Topic Selection (Master)
```
You are the Master of this round. Select ONE topic for the question you will create.

Available topics:
{{topics}}

Respond in JSON format:
{
  "selectedTopic": "topic_name",
  "reasoning": "Brief explanation of your choice"
}
```

### Question Creation (Master)
```
You are the Master. Create a challenging question about: {{topicName}}

Topic description: {{topicDescription}}

Requirements:
- Question should test knowledge/reasoning in this domain
- Question should be answerable in 1-3 paragraphs
- You will NOT answer this question yourself
- You will judge others' answers

Respond in JSON format:
{
  "question": "Your question here",
  "difficulty": "easy|medium|hard|expert",
  "evaluationHints": "What makes a good answer"
}
```

### Answer (Participant)
```
Answer the following question thoughtfully and completely.

QUESTION: {{question}}

Provide a clear, well-reasoned answer.
```

### Judging
```
You are judging answers to the following question:

QUESTION: {{question}}

Here are the answers (anonymized):

{{#each answers}}
[Answer {{letter}}]:
{{content}}

{{/each}}

For EACH answer, provide a score (0-100) and ranking.

Scoring criteria:
- Accuracy (40%): Is the information correct?
- Clarity (30%): Is the answer well-organized and easy to understand?
- Completeness (30%): Does it fully address the question?

Respond in JSON format:
{
  "judgments": [
    {
      "answerId": "A",
      "score": 85,
      "rank": 1,
      "reasoning": "Brief explanation",
      "criteriaScores": {
        "accuracy": 90,
        "clarity": 80,
        "completeness": 85
      }
    }
  ]
}
```

## State Machine Flow

```
SESSION_CREATED
    │
    │ startSession()
    ▼
SESSION_RUNNING
    │
    │ ┌─────────────────────────┐
    │ │     ROUND LOOP          │
    │ │                         │
    │ │ 1. Select Master        │
    │ │ 2. Master selects topic │
    │ │ 3. Master creates Q     │
    │ │ 4. Each model answers   │
    │ │ 5. Each model judges    │
    │ │ 6. Calculate scores     │
    │ │                         │
    │ └──────────┬──────────────┘
    │            │
    │   more rounds? ──No──▶ SESSION_COMPLETED
    │            │
    │           Yes
    │            │
    │            ▼
    │   Next Round (goto 1)
    │
    ▼
SESSION_PAUSED (can resume)
```

## Manual vs Cron Mode

### Manual Mode
- User clicks "Next Step" button
- `POST /api/arena/trigger` executes ONE step
- Returns step result immediately
- Frontend updates from response

### Cron Mode
- Scheduler triggers session start
- Engine runs through all steps automatically
- `stepDelayMs` pause between steps
- Events emitted for real-time updates (Phase 2)

## Files to Create/Modify

### New Files
- `app/server/src/services/game-engine.ts` - Core engine
- `app/server/src/services/prompt-builder.ts` - Prompt templates
- `app/server/src/api/arena.ts` - API endpoints
- `app/shared/src/types/game.ts` - Shared types

### Modified Files
- `app/server/src/db/schema.ts` - Add 4 tables
- `app/server/src/db/index.ts` - Export new types
- `app/server/src/index.ts` - Register arena router
- `app/shared/src/index.ts` - Export game types

## Testing Strategy

1. **Unit Tests**: GameEngine state transitions
2. **Integration Tests**: Full round execution with mock LLM
3. **Manual Testing**:
   - Create session via API
   - Start session
   - Monitor step progression
   - Verify scoring

## Success Criteria

- [ ] Can create a game session with selected models
- [ ] Session executes rounds in correct order
- [ ] Master selection rotates through models
- [ ] Master generates valid questions
- [ ] All participants answer sequentially
- [ ] All models judge (including master)
- [ ] Scores calculated with tiebreaker
- [ ] Manual trigger executes single step
- [ ] Events emitted for all state changes
