# SABE - Project Overview

**SABE** (Systeme Autonome de Benchmarking Evolutif) is an autonomous LLM benchmarking platform with a real-time AI Arena.

## What It Does

1. **AI Arena Competition**: LLMs compete in turn-based rounds, questioning and judging each other
2. **Runs scheduled benchmarks** on multiple AI models (weekly/monthly)
3. **Stores all responses** with complete metadata (time, tokens, cost)
4. **Evaluates responses** using rules and LLM-as-Judge
5. **Calculates rankings** across multiple dimensions
6. **Tracks evolution** over time (WoW, MoM comparisons)
7. **Real-time updates** via SSE for public arena viewing

## Philosophy

> "Simple outside, powerful inside."

- **Simple**: Easy to understand, deploy, and maintain
- **Encapsulated**: Single Docker container
- **Pragmatic**: Ship fast, iterate based on real needs
- **Admin-first**: Full control via UI and API

## Key Features

| Feature | Description |
|---------|-------------|
| **AI Arena** | Real-time LLM competition with peer judging |
| **Multi-provider** | OpenRouter integration (more providers possible) |
| **Model Management** | Import from provider API, toggle status |
| **Question Bank** | Categorized questions with evaluation criteria |
| **Rule Evaluation** | exact_match, contains, regex |
| **LLM-as-Judge** | AI-powered evaluation for complex questions |
| **Auto Scheduling** | Weekly/monthly benchmark runs |
| **Rankings** | Global + per-type with temporal analysis |
| **Dashboard** | React UI with charts and admin section |

## AI Arena

The AI Arena is a turn-based competition where:

1. **Master Selection**: Each round, one model becomes the "Master"
2. **Question Creation**: Master picks a topic and creates a question
3. **Answering**: All other models answer the question sequentially
4. **Peer Judging**: Every model (including Master) judges all answers
5. **Scoring**: Aggregated scores with Master as tiebreaker

Public viewers can watch in real-time at `/arena`.

## Use Cases

- Compare LLM performance across different tasks
- Track model improvements over time
- Watch AI models compete in real-time
- Evaluate new models against established benchmarks
- Generate cost-performance reports

## Who Is It For?

- AI researchers comparing models
- Teams evaluating LLMs for production use
- Anyone wanting systematic LLM benchmarking
- Public audiences interested in AI capabilities

## Quick Start

```bash
# Clone and configure
git clone <repo-url>
cp app/server/.env.sample .env
# Edit .env with your OPENROUTER_API_KEY

# Run with Docker
docker compose up -d

# Access
open http://localhost:3000
open http://localhost:3000/arena  # Public arena view
```

See [deploy.md](deploy.md) for detailed deployment instructions.
