# Phase 1: Backend Core - Implementation Notes

**Agent:** Phase 1 Implementation
**Date:** 2025-11-29
**Status:** ✅ COMPLETED

---

## Pre-Implementation Analysis

### Package Versions (Verified November 2025)

| Package | Proposed Version | Actual Latest | Decision |
|---------|-----------------|---------------|----------|
| drizzle-orm | ^0.38.0 | 0.44.7 | Use 0.44.x |
| drizzle-kit | ^0.30.0 | 0.31.7 | Use 0.31.x |
| better-sqlite3 | ^11.0.0 | 12.5.0 | Use 12.x |
| @types/better-sqlite3 | ^7.6.0 | 7.6.13 | Use 7.6.x |
| zod | ^3.24.0 | 4.1.13 | Use 3.24.x (safer) |

**Zod Version Decision:** Sticking with Zod 3.x for now since Zod 4 was released July 2025 and may have breaking changes. The plan specified 3.24.x which is stable and well-tested.

### Schema Design Refinements

Analyzed the proposed schema and making these adjustments:

1. **Using `integer` with `autoIncrement` for IDs is NOT the pattern** - The plan uses UUIDs as text which is fine for a small-scale app like this. Keeping UUIDs.

2. **Drizzle API updates** - The newer Drizzle versions use slightly different patterns. Will use the current recommended patterns from docs.

3. **Migrator import path** - Changed from `drizzle-orm/better-sqlite3/migrator` to the current pattern.

---

## Implementation Order

### Step 1: Dependencies
- drizzle-orm@^0.44.0
- drizzle-kit@^0.31.0
- better-sqlite3@^12.0.0
- @types/better-sqlite3@^7.6.0
- zod@^3.24.0 (shared package)
- uuid@^11.0.0 (server)
- @types/uuid@^10.0.0 (server dev)

### Step 2: Database Schema
Create `/app/server/src/db/schema.ts` with all 8 tables:
- providers
- models
- questionTypes
- questions
- benchmarkRuns
- taskExecutions
- evaluations
- rankings

### Step 3: Database Connection
Create `/app/server/src/db/index.ts`:
- Initialize better-sqlite3
- Configure WAL mode for performance
- Export drizzle instance
- Export migration function

### Step 4: Drizzle Kit Config
Create `/app/server/drizzle.config.ts`:
- Schema path
- Output directory for migrations
- Database credentials

### Step 5: Zod Schemas (Shared)
Add to `/app/shared/`:
- `src/schemas/provider.ts`
- `src/schemas/model.ts`
- `src/schemas/question.ts`
- `src/schemas/index.ts`
- Update `src/index.ts` to export schemas

### Step 6: API Routes
Create modular routes in `/app/server/src/api/`:
- `providers.ts` - Full CRUD
- `models.ts` - Full CRUD + status toggle
- `questions.ts` - Full CRUD + question types

### Step 7: Middleware
Create `/app/server/src/middleware/`:
- `errorHandler.ts` - Global error handling

### Step 8: Update Server Entry
Update `/app/server/src/index.ts`:
- Import routes
- Run migrations on startup
- Mount routes
- Add error handlers

---

## File Structure After Implementation

```
app/server/
├── drizzle/                    # Generated migrations
├── drizzle.config.ts           # Drizzle Kit config
├── src/
│   ├── api/
│   │   ├── providers.ts
│   │   ├── models.ts
│   │   └── questions.ts
│   ├── db/
│   │   ├── index.ts            # Connection + migrations
│   │   └── schema.ts           # All table definitions
│   ├── middleware/
│   │   └── errorHandler.ts
│   └── index.ts                # Entry point
└── package.json

app/shared/
├── src/
│   ├── schemas/
│   │   ├── provider.ts
│   │   ├── model.ts
│   │   ├── question.ts
│   │   └── index.ts
│   └── index.ts
└── package.json
```

---

## Key Changes from Original Plan

1. **Package versions updated** to latest stable releases
2. **Database path** uses environment variable or defaults to `./data/sabe.db`
3. **Schema types** exported from schema file for TypeScript inference
4. **Route handlers** use async/await with proper error propagation
5. **Validation errors** return detailed Zod error format

---

## Verification Commands

```bash
# After implementation:
npm run build:shared
npm run build:server

# Generate migrations
cd app/server && npm run db:generate

# Start server
npm run dev

# Test APIs
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/providers -H "Content-Type: application/json" -d '{"name":"OpenRouter","apiEndpoint":"https://openrouter.ai/api/v1","apiKeyEnvVar":"OPENROUTER_API_KEY"}'
```

---

## Next Agent Notes

Phase 1 is COMPLETE. What's ready:
- Database with all 8 tables (SQLite + Drizzle ORM)
- WAL mode enabled for better write performance
- Foreign key constraints enforced
- CRUD APIs for providers, models, questions, question types
- Zod validation on all inputs
- Global error handling middleware
- Migrations run automatically on server startup

**Ready for Phase 2: LLM Integration**
- Read `plan/PHASE_2_LLM_INTEGRATION.md`
- Provider table is ready to store OpenRouter config
- Model table ready to store LLM model configurations

## API Endpoints Implemented

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/health` | GET | Health check |
| `/api/providers` | GET, POST | List/create providers |
| `/api/providers/:id` | GET, PUT, DELETE | Single provider ops |
| `/api/models` | GET, POST | List/create models |
| `/api/models/:id` | GET, PUT, DELETE | Single model ops |
| `/api/models/:id/status` | PATCH | Toggle model status |
| `/api/questions/types` | GET, POST | List/create question types |
| `/api/questions/types/:id` | GET, PUT, DELETE | Question type ops |
| `/api/questions` | GET, POST | List/create questions |
| `/api/questions/:id` | GET, PUT, DELETE | Single question ops |
