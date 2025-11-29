# PHASE 4: Ranking System

**Status:** COMPLETED
**Goal:** Calculate rankings and track changes over time
**Estimated Time:** 2-3 hours
**Prerequisites:** Phase 3 completed
**Completed:** 2025-11-29

---

## Phase Objectives

By the end of this phase:
1. ✅ Ranking calculator service
2. ✅ Global rankings (all models, all questions)
3. ✅ Rankings by question type
4. ✅ Delta calculations (position changes)
5. ✅ Temporal analyzer for WoW comparisons
6. ✅ API endpoints for rankings data

---

## Progress Tracker

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 4.1 | Create ranking calculator service | ✅ COMPLETED | `app/server/src/services/ranking-calculator.ts` |
| 4.2 | Implement global ranking | ✅ COMPLETED | Averages scores across all questions |
| 4.3 | Implement per-type rankings | ✅ COMPLETED | Rankings by question type (dimension) |
| 4.4 | Add delta calculations | ✅ COMPLETED | Position/score changes vs previous run |
| 4.5 | Create temporal analyzer | ✅ COMPLETED | `app/server/src/services/temporal-analyzer.ts` |
| 4.6 | Add ranking API endpoints | ✅ COMPLETED | `app/server/src/api/rankings.ts` |
| 4.7 | Integrate with benchmark runner | ✅ COMPLETED | Auto-calculates rankings on run completion |
| 4.8 | Test complete ranking flow | ✅ COMPLETED | All endpoints verified working |

---

## Ranking Types Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      GLOBAL RANKING                          │
│  All models ranked by average score across all questions    │
│  Position: 1, 2, 3...                                       │
│  Delta: vs previous run                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  BY QUESTION TYPE                            │
│  Rankings per category: reasoning, code, creativity, etc.   │
│  Same model can rank differently per type                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    TEMPORAL ANALYSIS                         │
│  Week-over-Week (WoW): compare current to 7 days ago        │
│  Month-over-Month (MoM): compare to 30 days ago             │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 4.1: Create Ranking Calculator Service

Create `/app/server/src/services/ranking-calculator.ts`:

```typescript
import pino from 'pino';
import { v4 as uuid } from 'uuid';
import { db, schema } from '../db/index.js';
import { eq, and, desc, sql, lt, gte } from 'drizzle-orm';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export interface ModelScore {
  modelId: string;
  modelName: string;
  averageScore: number;
  totalQuestions: number;
  successRate: number;
}

export interface RankingEntry {
  modelId: string;
  position: number;
  score: number;
  previousPosition: number | null;
  deltaPosition: number | null;
  deltaScore: number | null;
  sampleSize: number;
}

export class RankingCalculator {
  /**
   * Calculate all rankings for a completed benchmark run
   */
  async calculateForRun(runId: string): Promise<void> {
    logger.info({ runId }, 'Starting ranking calculations');

    // Get the previous run for delta calculations
    const [currentRun] = await db
      .select()
      .from(schema.benchmarkRuns)
      .where(eq(schema.benchmarkRuns.id, runId));

    if (!currentRun) {
      throw new Error(`Run ${runId} not found`);
    }

    const [previousRun] = await db
      .select()
      .from(schema.benchmarkRuns)
      .where(
        and(
          lt(schema.benchmarkRuns.iterationNumber, currentRun.iterationNumber),
          eq(schema.benchmarkRuns.status, 'completed')
        )
      )
      .orderBy(desc(schema.benchmarkRuns.iterationNumber))
      .limit(1);

    // Calculate global rankings
    await this.calculateGlobalRanking(runId, previousRun?.id);

    // Calculate per-type rankings
    await this.calculateTypeRankings(runId, previousRun?.id);

    logger.info({ runId }, 'Ranking calculations completed');
  }

  /**
   * Calculate global ranking across all questions
   */
  private async calculateGlobalRanking(
    runId: string,
    previousRunId?: string
  ): Promise<void> {
    // Get average scores per model
    const scores = await this.getModelScores(runId);

    // Get previous rankings if available
    const previousRankings = previousRunId
      ? await this.getPreviousRankings(previousRunId, 'global')
      : new Map<string, { position: number; score: number }>();

    // Sort by score descending
    const sortedScores = [...scores].sort((a, b) => b.averageScore - a.averageScore);

    // Create ranking entries
    const rankings: RankingEntry[] = sortedScores.map((score, index) => {
      const position = index + 1;
      const previous = previousRankings.get(score.modelId);

      return {
        modelId: score.modelId,
        position,
        score: score.averageScore,
        previousPosition: previous?.position ?? null,
        deltaPosition: previous ? previous.position - position : null, // positive = improved
        deltaScore: previous ? score.averageScore - previous.score : null,
        sampleSize: score.totalQuestions,
      };
    });

    // Insert rankings
    await this.insertRankings(runId, 'global', null, rankings);

    logger.debug({
      runId,
      type: 'global',
      count: rankings.length,
    }, 'Global rankings calculated');
  }

  /**
   * Calculate rankings per question type
   */
  private async calculateTypeRankings(
    runId: string,
    previousRunId?: string
  ): Promise<void> {
    // Get all question types
    const questionTypes = await db.select().from(schema.questionTypes);

    for (const qType of questionTypes) {
      const scores = await this.getModelScoresByType(runId, qType.id);

      if (scores.length === 0) continue;

      const previousRankings = previousRunId
        ? await this.getPreviousRankings(previousRunId, 'by_question_type', qType.name)
        : new Map<string, { position: number; score: number }>();

      const sortedScores = [...scores].sort((a, b) => b.averageScore - a.averageScore);

      const rankings: RankingEntry[] = sortedScores.map((score, index) => {
        const position = index + 1;
        const previous = previousRankings.get(score.modelId);

        return {
          modelId: score.modelId,
          position,
          score: score.averageScore,
          previousPosition: previous?.position ?? null,
          deltaPosition: previous ? previous.position - position : null,
          deltaScore: previous ? score.averageScore - previous.score : null,
          sampleSize: score.totalQuestions,
        };
      });

      await this.insertRankings(runId, 'by_question_type', qType.name, rankings);

      logger.debug({
        runId,
        type: 'by_question_type',
        dimension: qType.name,
        count: rankings.length,
      }, 'Type rankings calculated');
    }
  }

  /**
   * Get average scores per model for a run
   */
  private async getModelScores(runId: string): Promise<ModelScore[]> {
    const results = await db
      .select({
        modelId: schema.taskExecutions.modelId,
        avgScore: sql<number>`AVG(${schema.evaluations.normalizedScore})`,
        totalQuestions: sql<number>`COUNT(DISTINCT ${schema.taskExecutions.questionId})`,
        successCount: sql<number>`SUM(CASE WHEN ${schema.taskExecutions.status} = 'success' THEN 1 ELSE 0 END)`,
        totalCount: sql<number>`COUNT(*)`,
      })
      .from(schema.taskExecutions)
      .leftJoin(
        schema.evaluations,
        eq(schema.taskExecutions.id, schema.evaluations.executionId)
      )
      .where(eq(schema.taskExecutions.runId, runId))
      .groupBy(schema.taskExecutions.modelId);

    // Get model names
    const models = await db.select().from(schema.models);
    const modelMap = new Map(models.map(m => [m.id, m.displayName]));

    return results.map(r => ({
      modelId: r.modelId,
      modelName: modelMap.get(r.modelId) ?? 'Unknown',
      averageScore: r.avgScore ?? 0,
      totalQuestions: r.totalQuestions ?? 0,
      successRate: r.totalCount > 0 ? (r.successCount / r.totalCount) * 100 : 0,
    }));
  }

  /**
   * Get average scores per model for a specific question type
   */
  private async getModelScoresByType(
    runId: string,
    typeId: string
  ): Promise<ModelScore[]> {
    const results = await db
      .select({
        modelId: schema.taskExecutions.modelId,
        avgScore: sql<number>`AVG(${schema.evaluations.normalizedScore})`,
        totalQuestions: sql<number>`COUNT(DISTINCT ${schema.taskExecutions.questionId})`,
        successCount: sql<number>`SUM(CASE WHEN ${schema.taskExecutions.status} = 'success' THEN 1 ELSE 0 END)`,
        totalCount: sql<number>`COUNT(*)`,
      })
      .from(schema.taskExecutions)
      .innerJoin(
        schema.questions,
        eq(schema.taskExecutions.questionId, schema.questions.id)
      )
      .leftJoin(
        schema.evaluations,
        eq(schema.taskExecutions.id, schema.evaluations.executionId)
      )
      .where(
        and(
          eq(schema.taskExecutions.runId, runId),
          eq(schema.questions.typeId, typeId)
        )
      )
      .groupBy(schema.taskExecutions.modelId);

    const models = await db.select().from(schema.models);
    const modelMap = new Map(models.map(m => [m.id, m.displayName]));

    return results.map(r => ({
      modelId: r.modelId,
      modelName: modelMap.get(r.modelId) ?? 'Unknown',
      averageScore: r.avgScore ?? 0,
      totalQuestions: r.totalQuestions ?? 0,
      successRate: r.totalCount > 0 ? (r.successCount / r.totalCount) * 100 : 0,
    }));
  }

  /**
   * Get previous rankings for delta calculations
   */
  private async getPreviousRankings(
    runId: string,
    rankingType: string,
    dimension?: string
  ): Promise<Map<string, { position: number; score: number }>> {
    let query = db
      .select()
      .from(schema.rankings)
      .where(
        and(
          eq(schema.rankings.runId, runId),
          eq(schema.rankings.rankingType, rankingType as 'global' | 'by_question_type' | 'comparative')
        )
      );

    const rankings = await query;

    // Filter by dimension if specified
    const filtered = dimension
      ? rankings.filter(r => r.dimension === dimension)
      : rankings;

    return new Map(
      filtered.map(r => [r.modelId, { position: r.position, score: r.score }])
    );
  }

  /**
   * Insert ranking entries into database
   */
  private async insertRankings(
    runId: string,
    rankingType: 'global' | 'by_question_type' | 'comparative',
    dimension: string | null,
    entries: RankingEntry[]
  ): Promise<void> {
    const now = new Date();

    const values = entries.map(entry => ({
      id: uuid(),
      runId,
      modelId: entry.modelId,
      rankingType,
      dimension,
      position: entry.position,
      score: entry.score,
      previousPosition: entry.previousPosition,
      deltaPosition: entry.deltaPosition,
      deltaScore: entry.deltaScore,
      sampleSize: entry.sampleSize,
      createdAt: now,
    }));

    if (values.length > 0) {
      await db.insert(schema.rankings).values(values);
    }
  }
}

// Singleton
let calculator: RankingCalculator | null = null;

export function getRankingCalculator(): RankingCalculator {
  if (!calculator) {
    calculator = new RankingCalculator();
  }
  return calculator;
}
```

---

## Step 4.2-4.4: Implement Ranking Types and Deltas

The implementation above already handles:

- **Global ranking** (`calculateGlobalRanking`)
- **Per-type rankings** (`calculateTypeRankings`)
- **Delta calculations** (comparing with previous run)

---

## Step 4.5: Create Temporal Analyzer

Create `/app/server/src/services/temporal-analyzer.ts`:

```typescript
import pino from 'pino';
import { db, schema } from '../db/index.js';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export type ComparisonPeriod = 'wow' | 'mom' | 'qoq' | 'yoy';

export interface TemporalComparison {
  modelId: string;
  modelName: string;
  periodType: ComparisonPeriod;
  currentScore: number;
  previousScore: number;
  deltaAbsolute: number;
  deltaPercentage: number;
  currentPosition: number;
  previousPosition: number | null;
  positionChange: number | null;
  trend: 'up' | 'down' | 'stable';
}

export interface ModelTrend {
  modelId: string;
  modelName: string;
  scores: Array<{
    runId: string;
    date: Date;
    score: number;
    position: number;
  }>;
}

export class TemporalAnalyzer {
  /**
   * Compare rankings between two periods
   */
  async compare(period: ComparisonPeriod): Promise<TemporalComparison[]> {
    const now = new Date();
    let previousDate: Date;

    switch (period) {
      case 'wow':
        previousDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'mom':
        previousDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'qoq':
        previousDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'yoy':
        previousDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get latest completed run
    const [latestRun] = await db
      .select()
      .from(schema.benchmarkRuns)
      .where(eq(schema.benchmarkRuns.status, 'completed'))
      .orderBy(desc(schema.benchmarkRuns.completedAt))
      .limit(1);

    if (!latestRun) {
      return [];
    }

    // Get run closest to previous date
    const [previousRun] = await db
      .select()
      .from(schema.benchmarkRuns)
      .where(
        and(
          eq(schema.benchmarkRuns.status, 'completed'),
          lte(schema.benchmarkRuns.completedAt, previousDate)
        )
      )
      .orderBy(desc(schema.benchmarkRuns.completedAt))
      .limit(1);

    if (!previousRun) {
      logger.debug({ period, previousDate }, 'No previous run found for comparison');
      return [];
    }

    // Get current rankings
    const currentRankings = await db
      .select()
      .from(schema.rankings)
      .where(
        and(
          eq(schema.rankings.runId, latestRun.id),
          eq(schema.rankings.rankingType, 'global')
        )
      );

    // Get previous rankings
    const previousRankings = await db
      .select()
      .from(schema.rankings)
      .where(
        and(
          eq(schema.rankings.runId, previousRun.id),
          eq(schema.rankings.rankingType, 'global')
        )
      );

    // Create map for previous rankings
    const previousMap = new Map(
      previousRankings.map(r => [r.modelId, { score: r.score, position: r.position }])
    );

    // Get model names
    const models = await db.select().from(schema.models);
    const modelMap = new Map(models.map(m => [m.id, m.displayName]));

    // Build comparisons
    const comparisons: TemporalComparison[] = currentRankings.map(current => {
      const previous = previousMap.get(current.modelId);
      const deltaAbsolute = previous ? current.score - previous.score : 0;
      const deltaPercentage = previous && previous.score > 0
        ? ((current.score - previous.score) / previous.score) * 100
        : 0;
      const positionChange = previous
        ? previous.position - current.position // positive = improved
        : null;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (deltaAbsolute > 1) trend = 'up';
      else if (deltaAbsolute < -1) trend = 'down';

      return {
        modelId: current.modelId,
        modelName: modelMap.get(current.modelId) ?? 'Unknown',
        periodType: period,
        currentScore: current.score,
        previousScore: previous?.score ?? 0,
        deltaAbsolute,
        deltaPercentage,
        currentPosition: current.position,
        previousPosition: previous?.position ?? null,
        positionChange,
        trend,
      };
    });

    return comparisons.sort((a, b) => a.currentPosition - b.currentPosition);
  }

  /**
   * Get score trend for a specific model
   */
  async getModelTrend(
    modelId: string,
    limit: number = 10
  ): Promise<ModelTrend | null> {
    // Get model info
    const [model] = await db
      .select()
      .from(schema.models)
      .where(eq(schema.models.id, modelId));

    if (!model) {
      return null;
    }

    // Get rankings for this model from recent runs
    const rankings = await db
      .select({
        runId: schema.rankings.runId,
        score: schema.rankings.score,
        position: schema.rankings.position,
        createdAt: schema.rankings.createdAt,
      })
      .from(schema.rankings)
      .where(
        and(
          eq(schema.rankings.modelId, modelId),
          eq(schema.rankings.rankingType, 'global')
        )
      )
      .orderBy(desc(schema.rankings.createdAt))
      .limit(limit);

    return {
      modelId,
      modelName: model.displayName,
      scores: rankings.map(r => ({
        runId: r.runId,
        date: r.createdAt,
        score: r.score,
        position: r.position,
      })),
    };
  }

  /**
   * Get all models' trends for chart visualization
   */
  async getAllModelTrends(limit: number = 10): Promise<ModelTrend[]> {
    const models = await db
      .select()
      .from(schema.models)
      .where(eq(schema.models.status, 'active'));

    const trends: ModelTrend[] = [];

    for (const model of models) {
      const trend = await this.getModelTrend(model.id, limit);
      if (trend && trend.scores.length > 0) {
        trends.push(trend);
      }
    }

    return trends;
  }
}

// Singleton
let analyzer: TemporalAnalyzer | null = null;

export function getTemporalAnalyzer(): TemporalAnalyzer {
  if (!analyzer) {
    analyzer = new TemporalAnalyzer();
  }
  return analyzer;
}
```

---

## Step 4.6: Add Ranking API Endpoints

Create `/app/server/src/api/rankings.ts`:

```typescript
import { Router } from 'express';
import { db, schema } from '../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { getTemporalAnalyzer } from '../services/temporal-analyzer.js';

const router = Router();

// GET /api/rankings/latest - Get latest global rankings
router.get('/latest', async (req, res, next) => {
  try {
    // Get latest completed run
    const [latestRun] = await db
      .select()
      .from(schema.benchmarkRuns)
      .where(eq(schema.benchmarkRuns.status, 'completed'))
      .orderBy(desc(schema.benchmarkRuns.completedAt))
      .limit(1);

    if (!latestRun) {
      return res.json({ data: [], run: null });
    }

    // Get global rankings
    const rankings = await db
      .select()
      .from(schema.rankings)
      .where(
        and(
          eq(schema.rankings.runId, latestRun.id),
          eq(schema.rankings.rankingType, 'global')
        )
      )
      .orderBy(schema.rankings.position);

    // Get model names
    const models = await db.select().from(schema.models);
    const modelMap = new Map(models.map(m => [m.id, m]));

    const enrichedRankings = rankings.map(r => ({
      ...r,
      model: modelMap.get(r.modelId) ?? null,
    }));

    res.json({
      data: enrichedRankings,
      run: {
        id: latestRun.id,
        iterationNumber: latestRun.iterationNumber,
        completedAt: latestRun.completedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/rankings/by-type/:type - Get rankings for a question type
router.get('/by-type/:type', async (req, res, next) => {
  try {
    const typeName = req.params.type;

    // Get latest completed run
    const [latestRun] = await db
      .select()
      .from(schema.benchmarkRuns)
      .where(eq(schema.benchmarkRuns.status, 'completed'))
      .orderBy(desc(schema.benchmarkRuns.completedAt))
      .limit(1);

    if (!latestRun) {
      return res.json({ data: [], run: null });
    }

    // Get rankings for this type
    const rankings = await db
      .select()
      .from(schema.rankings)
      .where(
        and(
          eq(schema.rankings.runId, latestRun.id),
          eq(schema.rankings.rankingType, 'by_question_type'),
          eq(schema.rankings.dimension, typeName)
        )
      )
      .orderBy(schema.rankings.position);

    // Get model names
    const models = await db.select().from(schema.models);
    const modelMap = new Map(models.map(m => [m.id, m]));

    const enrichedRankings = rankings.map(r => ({
      ...r,
      model: modelMap.get(r.modelId) ?? null,
    }));

    res.json({
      data: enrichedRankings,
      type: typeName,
      run: {
        id: latestRun.id,
        iterationNumber: latestRun.iterationNumber,
        completedAt: latestRun.completedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/rankings/compare/:period - Compare rankings over time
router.get('/compare/:period', async (req, res, next) => {
  try {
    const period = req.params.period as 'wow' | 'mom' | 'qoq' | 'yoy';

    if (!['wow', 'mom', 'qoq', 'yoy'].includes(period)) {
      return res.status(400).json({
        error: 'Invalid period. Use: wow, mom, qoq, or yoy',
      });
    }

    const analyzer = getTemporalAnalyzer();
    const comparisons = await analyzer.compare(period);

    res.json({
      data: comparisons,
      period,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/rankings/history/:modelId - Get model ranking history
router.get('/history/:modelId', async (req, res, next) => {
  try {
    const { limit = '10' } = req.query;

    const analyzer = getTemporalAnalyzer();
    const trend = await analyzer.getModelTrend(
      req.params.modelId,
      Number(limit)
    );

    if (!trend) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({ data: trend });
  } catch (error) {
    next(error);
  }
});

// GET /api/rankings/trends - Get all models' trends for charts
router.get('/trends', async (req, res, next) => {
  try {
    const { limit = '10' } = req.query;

    const analyzer = getTemporalAnalyzer();
    const trends = await analyzer.getAllModelTrends(Number(limit));

    res.json({ data: trends });
  } catch (error) {
    next(error);
  }
});

// GET /api/rankings/run/:runId - Get rankings for specific run
router.get('/run/:runId', async (req, res, next) => {
  try {
    const { type = 'global' } = req.query;

    const rankings = await db
      .select()
      .from(schema.rankings)
      .where(
        and(
          eq(schema.rankings.runId, req.params.runId),
          eq(schema.rankings.rankingType, type as 'global' | 'by_question_type' | 'comparative')
        )
      )
      .orderBy(schema.rankings.position);

    // Get model names
    const models = await db.select().from(schema.models);
    const modelMap = new Map(models.map(m => [m.id, m]));

    const enrichedRankings = rankings.map(r => ({
      ...r,
      model: modelMap.get(r.modelId) ?? null,
    }));

    res.json({ data: enrichedRankings });
  } catch (error) {
    next(error);
  }
});

export default router;
```

Update `/app/server/src/index.ts`:

```typescript
// Add import
import rankingsRouter from './api/rankings.js';

// Add route
app.use('/api/rankings', rankingsRouter);
```

---

## Step 4.7: Integrate with Benchmark Runner

Update `/app/server/src/services/benchmark-runner.ts`:

Add import at top:
```typescript
import { getRankingCalculator } from './ranking-calculator.js';
```

Update the `executeRun` method, add after updating status to 'completed':

```typescript
// In executeRun(), after updating run to 'completed':

// Calculate rankings
const rankingCalculator = getRankingCalculator();
await rankingCalculator.calculateForRun(runId);

logger.info({
  runId,
  successCount,
  errorCount,
  totalTasks: models.length * questions.length,
}, 'Benchmark run completed with rankings');
```

Full updated section:
```typescript
// Update run as completed
await db
  .update(schema.benchmarkRuns)
  .set({
    status: 'completed',
    completedAt: new Date(),
  })
  .where(eq(schema.benchmarkRuns.id, runId));

// Calculate rankings
const rankingCalculator = getRankingCalculator();
await rankingCalculator.calculateForRun(runId);

logger.info({
  runId,
  successCount,
  errorCount,
  totalTasks: models.length * questions.length,
}, 'Benchmark run completed with rankings');
```

---

## Step 4.8: Test Complete Ranking Flow

### Run a benchmark:
```bash
curl -X POST http://localhost:3000/api/runs \
  -H "Content-Type: application/json" \
  -d '{}'

# Wait for completion...
curl http://localhost:3000/api/runs/{runId}/progress
```

### Get latest rankings:
```bash
curl http://localhost:3000/api/rankings/latest
```

Expected response:
```json
{
  "data": [
    {
      "id": "ranking-uuid",
      "runId": "run-uuid",
      "modelId": "model-uuid",
      "position": 1,
      "score": 85.5,
      "deltaPosition": null,
      "deltaScore": null,
      "model": {
        "id": "model-uuid",
        "displayName": "Claude 3.5 Sonnet"
      }
    }
  ],
  "run": {
    "id": "run-uuid",
    "iterationNumber": 1,
    "completedAt": "2025-11-28T..."
  }
}
```

### Get rankings by type:
```bash
curl http://localhost:3000/api/rankings/by-type/reasoning
```

### Run a second benchmark and check deltas:
```bash
# Run second benchmark
curl -X POST http://localhost:3000/api/runs

# Wait for completion, then check rankings
curl http://localhost:3000/api/rankings/latest

# Should now have deltaPosition and deltaScore values
```

### Test temporal comparisons:
```bash
curl http://localhost:3000/api/rankings/compare/wow
```

### Get model trend:
```bash
curl http://localhost:3000/api/rankings/history/{modelId}
```

---

## Verification Checklist

Before marking Phase 4 complete:

- [x] Ranking calculator creates global rankings after run
- [x] Per-type rankings calculated for each question type
- [x] Delta calculations show position changes
- [x] Delta calculations show score changes
- [x] `/api/rankings/latest` returns current rankings
- [x] `/api/rankings/by-type/:type` works for each type
- [x] `/api/rankings/compare/wow` returns comparisons (empty until data exists)
- [x] `/api/rankings/history/:modelId` shows trend
- [x] Rankings include model details (name, etc.)
- [x] Second run shows deltas from first run

---

## Next Phase

Once all verifications pass, proceed to:
**→ PHASE_5_FRONTEND.md**

---

## Troubleshooting

### "No rankings found"
- Ensure benchmark run completed successfully
- Check that ranking calculator was called
- Verify tasks have evaluations

### Deltas always null
- Need at least 2 completed runs
- Check previous run has same models
- Verify ranking type matches

### WoW comparison empty
- Need a run from 7+ days ago
- Check run dates in database
- Try 'mom' or custom period

### Missing model names
- Ensure models exist in database
- Check model IDs match between tables
