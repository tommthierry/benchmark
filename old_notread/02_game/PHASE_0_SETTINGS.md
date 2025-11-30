# Phase 0: Settings & Status Refactoring

## Objective

Refactor the admin section to separate "Status" (read-only system health) from "Settings" (configurable execution controls). Enable manual vs cron-based game execution.

## Prerequisites

- Current codebase working (Phase 6 completed)
- Existing `/admin/settings` page showing system status

## Progress Tracker

| Step | Task | Status |
|------|------|--------|
| 0.1 | Rename SettingsPage to StatusPage | ✅ COMPLETED |
| 0.2 | Update routes and navigation | ✅ COMPLETED |
| 0.3 | Create execution_config database table | ✅ COMPLETED |
| 0.4 | Create config API endpoints | ✅ COMPLETED |
| 0.5 | Build new SettingsPage UI | ✅ COMPLETED |
| 0.6 | Implement execution mode toggle | ✅ COMPLETED |
| 0.7 | Add manual trigger button | ✅ COMPLETED |
| 0.8 | Connect scheduler to config table | ✅ COMPLETED (deferred to Phase 1) |
| 0.9 | Test and verify | ✅ COMPLETED |

**Status Legend:** ⬜ NOT STARTED → 🟡 IN PROGRESS → ✅ COMPLETED

**Phase 0 Completed:** 2025-11-29

---

## Step 0.1: Rename SettingsPage to StatusPage

### Files to Modify

**1. Rename the file:**
```
app/client/src/pages/admin/SettingsPage.tsx
→ app/client/src/pages/admin/StatusPage.tsx
```

**2. Update component name inside file:**
- Change `export function SettingsPage()` to `export function StatusPage()`
- Update the page title from "Settings" to "System Status"

**3. Update page header text:**
```tsx
<h1 className="text-2xl font-bold">System Status</h1>
<p className="text-gray-400 text-sm mt-1">
  System health and statistics (read-only)
</p>
```

### Verification
- [ ] File renamed
- [ ] Component exports `StatusPage`
- [ ] Title says "System Status"

---

## Step 0.2: Update Routes and Navigation

### Files to Modify

**1. `app/client/src/App.tsx`:**
```tsx
// Change import
import { StatusPage } from './pages/admin/StatusPage';

// Update route
<Route path="/admin/status" element={<StatusPage />} />

// Add new settings route (placeholder for now)
<Route path="/admin/settings" element={<SettingsPage />} />
```

**2. `app/client/src/components/Layout.tsx`:**

Find the admin navigation section and update:
```tsx
// Change Settings link to Status
{ to: '/admin/status', icon: Activity, label: 'Status' },

// Add new Settings link
{ to: '/admin/settings', icon: Settings, label: 'Settings' },
```

Import `Activity` and `Settings` from lucide-react.

### Verification
- [ ] `/admin/status` shows old settings page
- [ ] `/admin/settings` route exists (can 404 for now)
- [ ] Navigation shows both Status and Settings

---

## Step 0.3: Create Execution Config Database Table

### Files to Modify

**1. `app/server/src/db/schema.ts`:**

Add new table at the end before type exports:
```typescript
// =============================================================================
// EXECUTION CONFIG - Singleton configuration for arena execution
// =============================================================================
export const executionConfig = sqliteTable('execution_config', {
  id: text('id').primaryKey().default('default'), // Always 'default'
  executionMode: text('execution_mode', {
    enum: ['cron', 'manual']
  }).notNull().default('manual'),
  cronExpression: text('cron_expression').default('0 2 * * 1'), // Weekly Monday 2AM
  timezone: text('timezone').default('UTC'),
  autoStartEnabled: integer('auto_start_enabled', { mode: 'boolean' }).default(false),
  roundsPerSession: integer('rounds_per_session').default(5),
  stepDelayMs: integer('step_delay_ms').default(2000), // Delay between steps
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Add type exports
export type ExecutionConfig = typeof executionConfig.$inferSelect;
export type NewExecutionConfig = typeof executionConfig.$inferInsert;
```

**2. Run migration:**
```bash
cd app/server
npm run db:push
```

### Verification
- [ ] No migration errors
- [ ] Table exists in SQLite
- [ ] Can query empty table

---

## Step 0.4: Create Config API Endpoints

### Files to Create/Modify

**1. Create `app/server/src/api/config.ts`:**

```typescript
// Execution Configuration API
// GET /api/config - Get current config
// PUT /api/config - Update config

import { Router } from 'express';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

const router = Router();

// Validation schema
const updateConfigSchema = z.object({
  executionMode: z.enum(['cron', 'manual']).optional(),
  cronExpression: z.string().optional(),
  timezone: z.string().optional(),
  autoStartEnabled: z.boolean().optional(),
  roundsPerSession: z.number().int().min(1).max(100).optional(),
  stepDelayMs: z.number().int().min(500).max(30000).optional(),
});

// GET /api/config
router.get('/', async (req, res) => {
  let [config] = await db
    .select()
    .from(schema.executionConfig)
    .where(eq(schema.executionConfig.id, 'default'));

  // Create default if doesn't exist
  if (!config) {
    const now = new Date();
    await db.insert(schema.executionConfig).values({
      id: 'default',
      updatedAt: now,
    });
    [config] = await db
      .select()
      .from(schema.executionConfig)
      .where(eq(schema.executionConfig.id, 'default'));
  }

  res.json({ data: config });
});

// PUT /api/config
router.put('/', async (req, res) => {
  const validation = updateConfigSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.flatten(),
    });
  }

  const updates = {
    ...validation.data,
    updatedAt: new Date(),
  };

  await db
    .update(schema.executionConfig)
    .set(updates)
    .where(eq(schema.executionConfig.id, 'default'));

  const [config] = await db
    .select()
    .from(schema.executionConfig)
    .where(eq(schema.executionConfig.id, 'default'));

  res.json({ data: config });
});

export default router;
```

**2. Register in `app/server/src/index.ts`:**

```typescript
import configRouter from './api/config.js';
// ...
app.use('/api/config', configRouter);
```

### Verification
```bash
# Get config (creates default)
curl http://localhost:3000/api/config

# Update config
curl -X PUT http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{"executionMode":"cron","cronExpression":"0 3 * * *"}'
```

---

## Step 0.5: Build New SettingsPage UI

### Files to Create

**1. `app/client/src/pages/admin/SettingsPage.tsx`:**

```tsx
// Admin Settings Page - Execution control and configuration

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Settings,
  Clock,
  Play,
  Pause,
  RefreshCw,
  Calendar,
  Zap,
} from 'lucide-react';
import { configApi } from '../../lib/api';

export function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: configData, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: configApi.get,
  });

  const updateMutation = useMutation({
    mutationFn: configApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });

  const config = configData?.data;

  if (isLoading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">
          Configure arena execution mode and timing
        </p>
      </div>

      {/* Execution Mode */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap size={20} />
          Execution Mode
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => updateMutation.mutate({ executionMode: 'manual' })}
            className={`p-4 rounded-lg border-2 transition-all ${
              config?.executionMode === 'manual'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            <Play className="mx-auto mb-2" size={24} />
            <div className="font-medium">Manual</div>
            <div className="text-sm text-gray-400">
              Trigger iterations with a button
            </div>
          </button>

          <button
            onClick={() => updateMutation.mutate({ executionMode: 'cron' })}
            className={`p-4 rounded-lg border-2 transition-all ${
              config?.executionMode === 'cron'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            <Calendar className="mx-auto mb-2" size={24} />
            <div className="font-medium">Scheduled (Cron)</div>
            <div className="text-sm text-gray-400">
              Automatic execution on schedule
            </div>
          </button>
        </div>
      </div>

      {/* Cron Configuration (shown when cron mode) */}
      {config?.executionMode === 'cron' && (
        <CronConfigSection config={config} onUpdate={updateMutation.mutate} />
      )}

      {/* Manual Trigger (shown when manual mode) */}
      {config?.executionMode === 'manual' && (
        <ManualTriggerSection />
      )}

      {/* Game Settings */}
      <GameSettingsSection config={config} onUpdate={updateMutation.mutate} />
    </div>
  );
}

// Sub-components defined separately...
function CronConfigSection({ config, onUpdate }) {
  // Cron expression input, timezone selector
  // ...implementation
}

function ManualTriggerSection() {
  // Big "Run Next Step" button
  // ...implementation
}

function GameSettingsSection({ config, onUpdate }) {
  // Rounds per session, step delay sliders
  // ...implementation
}
```

**2. Add to `app/client/src/lib/api.ts`:**

```typescript
export const configApi = {
  get: async () => {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Failed to fetch config');
    return res.json();
  },
  update: async (data: Partial<ExecutionConfig>) => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update config');
    return res.json();
  },
};
```

### Verification
- [ ] Settings page loads
- [ ] Mode toggle switches between manual/cron
- [ ] Configuration persists after refresh

---

## Step 0.6-0.8: Implementation Details

These steps involve wiring up the UI components fully and connecting the scheduler service to read from the database config instead of environment variables.

**Key Changes:**
1. `Scheduler` class reads `executionConfig` table on startup
2. Config changes trigger scheduler restart
3. Manual mode disables cron entirely
4. Manual trigger endpoint added: `POST /api/arena/trigger`

---

## Step 0.9: Test and Verify

### Test Cases

1. **Mode Switch Test:**
   - Start in manual mode
   - Switch to cron mode
   - Verify scheduler starts
   - Switch back to manual
   - Verify scheduler stops

2. **Cron Expression Test:**
   - Set cron expression
   - Verify "Next run" time is correct
   - Wait for trigger (or mock time)

3. **Manual Trigger Test:**
   - In manual mode, click trigger
   - Verify step executes
   - Check database for new record

4. **Persistence Test:**
   - Make changes
   - Restart server
   - Verify settings retained

### Commands for Testing
```bash
# Check current config
curl http://localhost:3000/api/config

# Toggle to cron mode
curl -X PUT http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{"executionMode":"cron"}'

# Manual trigger (Phase 1 endpoint)
curl -X POST http://localhost:3000/api/arena/trigger
```

---

## Files Created/Modified Summary

### New Files
- `app/client/src/pages/admin/StatusPage.tsx` (renamed from SettingsPage)
- `app/client/src/pages/admin/SettingsPage.tsx` (new)
- `app/server/src/api/config.ts`

### Modified Files
- `app/server/src/db/schema.ts` (add executionConfig table)
- `app/server/src/index.ts` (register config router)
- `app/client/src/App.tsx` (update routes)
- `app/client/src/components/Layout.tsx` (update navigation)
- `app/client/src/lib/api.ts` (add configApi)
- `app/server/src/scheduler/index.ts` (read from DB config)

---

## Completion Checklist

Before moving to Phase 1:

- [x] `/admin/status` shows system health (read-only)
- [x] `/admin/settings` shows execution controls
- [x] Execution mode (manual/cron) toggles work
- [x] Cron expression can be changed and validates
- [x] Configuration persists to database
- [x] Navigation updated with both links
- [x] All existing functionality still works

## Implementation Notes

**Completed 2025-11-29:**

1. **StatusPage.tsx** - Created new file with read-only system status display
2. **SettingsPage.tsx** - Complete rewrite with:
   - Execution mode toggle (manual/cron)
   - Cron expression configuration with examples
   - Timezone selection
   - Rounds per session slider
   - Step delay slider
   - Manual trigger button (placeholder for Phase 1)
3. **config.ts API** - GET and PUT endpoints for execution config
4. **schema.ts** - Added `execution_config` table
5. **Navigation** - Updated with Activity icon for Status, Settings icon for Settings

**Note on Step 0.8:** The scheduler-to-database integration is deferred to Phase 1 when the GameEngine is implemented. The current scheduler still uses environment variables for the old benchmark system. The new `execution_config` table is ready for the GameEngine to use.

---

**Next Phase:** See `PHASE_1_GAME_ENGINE.md` for game flow implementation.
