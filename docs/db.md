# Database Schema

SQLite database with Drizzle ORM. Schema defined in `app/server/src/db/schema.ts`.

## Entity Relationship

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  providers  │────►│   models    │     │  questions  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                    ┌──────┴───────────────────┴──────┐
                    ▼                                  ▼
              ┌─────────────┐                   ┌─────────────┐
              │ benchmark_  │                   │  question_  │
              │    runs     │                   │   types     │
              └─────────────┘                   └─────────────┘
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


┌─────────────────── AI ARENA ───────────────────┐
│                                                 │
│  ┌─────────────┐     ┌─────────────┐           │
│  │   game_     │────►│   rounds    │           │
│  │  sessions   │     └──────┬──────┘           │
│  └─────────────┘            │                  │
│                      ┌──────┴──────┐           │
│                      ▼             ▼           │
│               ┌─────────────┐ ┌──────────────┐ │
│               │ round_steps │ │   model_     │ │
│               └─────────────┘ │  judgments   │ │
│                               └──────────────┘ │
│                                                │
└────────────────────────────────────────────────┘
```

## Core Tables

### providers

LLM API providers (OpenRouter, etc.)

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| name | TEXT UNIQUE | Display name |
| api_endpoint | TEXT | Base URL |
| api_key_env_var | TEXT | Env var name for API key |
| status | TEXT | active, inactive |
| rate_limit_per_minute | INTEGER | Rate limit |
| config | JSON | Provider-specific config |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### models

LLM models catalog.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| provider_id | TEXT FK | → providers.id |
| provider_model_id | TEXT | e.g., "anthropic/claude-3.5-sonnet" |
| display_name | TEXT | Human-readable name |
| label | TEXT | Custom tag |
| status | TEXT | active, inactive, deprecated |
| context_size | INTEGER | Max tokens |
| cost_input_per_million | REAL | $ per 1M input tokens |
| cost_output_per_million | REAL | $ per 1M output tokens |
| config | JSON | temperature, maxTokens |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### question_types

Categories for benchmark questions.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| name | TEXT UNIQUE | reasoning, code, factual, etc. |
| description | TEXT | |
| weight | REAL | Scoring weight |
| created_at | TIMESTAMP | |

### questions

Benchmark prompts.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| type_id | TEXT FK | → question_types.id |
| content | TEXT | The prompt |
| expected_answer | TEXT | For exact_match |
| evaluation_method | TEXT | exact_match, contains, regex, llm_judge |
| evaluation_criteria | JSON | pattern, keywords, rubric |
| difficulty | TEXT | easy, medium, hard, expert |
| weight | REAL | Scoring weight |
| status | TEXT | active, archived |
| version | INTEGER | Increments on update |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

## Benchmark Tables

### benchmark_runs

Execution instances.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| iteration_number | INTEGER | Run sequence |
| status | TEXT | pending, running, completed, failed, cancelled |
| started_at | TIMESTAMP | |
| completed_at | TIMESTAMP | |
| models_count | INTEGER | Models in this run |
| questions_count | INTEGER | Questions in this run |
| config_snapshot | JSON | Config used |
| error_log | TEXT | Error details |
| created_at | TIMESTAMP | |

### task_executions

Individual model responses.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| run_id | TEXT FK | → benchmark_runs.id |
| model_id | TEXT FK | → models.id |
| question_id | TEXT FK | → questions.id |
| input_prompt | TEXT | Actual prompt sent |
| response_content | TEXT | Model response |
| response_time_ms | INTEGER | Latency |
| tokens_input | INTEGER | Input token count |
| tokens_output | INTEGER | Output token count |
| cost | REAL | Calculated cost |
| status | TEXT | pending, success, error, timeout |
| error_message | TEXT | Error details |
| raw_response | JSON | Full API response |
| created_at | TIMESTAMP | |

### evaluations

Scored responses.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| execution_id | TEXT FK | → task_executions.id |
| evaluator_type | TEXT | rule_based, llm_judge |
| evaluator_model_id | TEXT FK | → models.id (if llm_judge) |
| score | REAL | Raw score |
| max_score | REAL | Default 100 |
| normalized_score | REAL | 0-100 scale |
| justification | TEXT | Evaluation explanation |
| criteria_scores | JSON | Per-criteria breakdown |
| created_at | TIMESTAMP | |

### rankings

Calculated rankings.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| run_id | TEXT FK | → benchmark_runs.id |
| model_id | TEXT FK | → models.id |
| ranking_type | TEXT | global, by_question_type, comparative |
| dimension | TEXT | e.g., "reasoning" for by_question_type |
| position | INTEGER | 1, 2, 3... |
| score | REAL | Average score |
| previous_position | INTEGER | Position in previous run |
| delta_position | INTEGER | Change (+ = improved) |
| delta_score | REAL | Score change |
| sample_size | INTEGER | Questions evaluated |
| metadata | JSON | Additional data |
| created_at | TIMESTAMP | |

## AI Arena Tables

### game_sessions

Arena session tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| status | TEXT | created, running, paused, completed, failed |
| total_rounds | INTEGER | Number of rounds |
| completed_rounds | INTEGER | Rounds completed |
| current_round_id | TEXT FK | Current round |
| participating_model_ids | JSON | Array of model UUIDs |
| config | JSON | stepDelayMs, allowTies |
| started_at | TIMESTAMP | |
| completed_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

### rounds

Individual rounds within a session.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| session_id | TEXT FK | → game_sessions.id |
| round_number | INTEGER | Round sequence |
| status | TEXT | created, topic_selection, question_creation, answering, judging, scoring, completed, failed |
| master_id | TEXT FK | → models.id (Master for this round) |
| topic_id | TEXT FK | → question_types.id |
| question_content | TEXT | Master's question |
| question_difficulty | TEXT | easy, medium, hard, expert |
| started_at | TIMESTAMP | |
| completed_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

### round_steps

Atomic steps within a round.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| round_id | TEXT FK | → rounds.id |
| step_number | INTEGER | Step sequence |
| step_type | TEXT | master_topic, master_question, model_answer, model_judge, scoring |
| status | TEXT | pending, running, completed, failed, skipped |
| actor_model_id | TEXT FK | Model performing the step |
| target_model_id | TEXT FK | Target model (for judging) |
| input_data | JSON | Step input |
| output_data | JSON | Step output |
| llm_response_time_ms | INTEGER | LLM latency |
| llm_tokens_used | INTEGER | Token count |
| error_message | TEXT | Error details |
| started_at | TIMESTAMP | |
| completed_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

### model_judgments

Peer evaluation scores.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| round_id | TEXT FK | → rounds.id |
| step_id | TEXT FK | → round_steps.id |
| judge_model_id | TEXT FK | Model that judged |
| target_model_id | TEXT FK | Model being judged |
| score | REAL | 0-100 score |
| rank | INTEGER | Ranking given |
| reasoning | TEXT | Judge's reasoning |
| criteria_scores | JSON | accuracy, clarity, completeness |
| is_master_judgment | BOOLEAN | True if Master's judgment |
| created_at | TIMESTAMP | |

## Configuration Tables

### execution_config

Singleton configuration for arena execution.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Always 'default' |
| execution_mode | TEXT | cron, manual |
| cron_expression | TEXT | Cron schedule |
| timezone | TEXT | Timezone for cron |
| auto_start_enabled | BOOLEAN | Auto-start on boot |
| rounds_per_session | INTEGER | Default rounds |
| step_delay_ms | INTEGER | Delay between steps |
| updated_at | TIMESTAMP | |

## Commands

```bash
# From app/server directory:
npm run db:generate   # Generate migrations from schema
npm run db:push       # Push schema (dev only)
npm run db:studio     # Open Drizzle Studio GUI
```

## Notes

- WAL mode enabled for better concurrent access
- Foreign keys enforced
- All timestamps stored as Unix epoch integers
- JSON columns stored as TEXT with JSON mode
