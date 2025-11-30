# Phase 2: Real-time Communication Layer

## Objective

Implement Server-Sent Events (SSE) to stream game state changes to the frontend in real-time. Enable the public arena page to display live updates as each step executes.

## Prerequisites

- Phase 1 completed (GameEngine emits events)
- GameEngine `EventEmitter` pattern working
- Arena API endpoints functional

## Progress Tracker

| Step | Task | Status |
|------|------|--------|
| 2.1 | Create SSE middleware | ✅ COMPLETED |
| 2.2 | Create event stream endpoint | ✅ COMPLETED |
| 2.3 | Connect GameEngine events to SSE | ✅ COMPLETED |
| 2.4 | Add client-side EventSource hook | ✅ COMPLETED |
| 2.5 | Implement reconnection handling | ✅ COMPLETED |
| 2.6 | Add heartbeat mechanism | ✅ COMPLETED |
| 2.7 | Create shared event types | ✅ COMPLETED |
| 2.8 | Test with multiple clients | ✅ COMPLETED |

**Status Legend:** ⬜ NOT STARTED → 🟡 IN PROGRESS → ✅ COMPLETED

**Phase 2 Completed:** 2025-11-29

---

## Why SSE over WebSocket

| Feature | SSE | WebSocket |
|---------|-----|-----------|
| Direction | Server → Client (unidirectional) | Bidirectional |
| Reconnection | Built-in (automatic) | Manual implementation |
| Protocol | HTTP/2 compatible | Separate protocol |
| Complexity | Low | Medium |
| Use case fit | Perfect for game updates | Overkill |

Our use case: Server pushes game state updates to viewers. Viewers don't send data back (except manual trigger via REST). SSE is the right choice.

---

## Implementation Summary

### Files Created

1. **`app/server/src/middleware/sse.ts`** (~70 lines)
   - SSE middleware that sets proper headers
   - Adds `res.sse.send()` and `res.sse.sendComment()` helper methods
   - Handles client disconnect cleanup

2. **`app/server/src/services/event-bridge.ts`** (~150 lines)
   - Bridges GameEngine events to SSE clients
   - Client management (add/remove/get count)
   - Event type mapping (internal → SSE format)
   - Heartbeat mechanism (30s interval)
   - State snapshot sending

3. **`app/shared/src/types/events.ts`** (~100 lines)
   - All SSE event type definitions
   - Union type `ArenaEvent` for type-safe handling
   - Event-specific interfaces with proper typing

4. **`app/client/src/hooks/useArenaEvents.ts`** (~200 lines)
   - React hook for SSE connection management
   - Exponential backoff reconnection (1s → 30s max)
   - Tab visibility handling (reconnect on visible)
   - Stale connection detection (60s timeout)
   - TanStack Query cache invalidation
   - Event-specific callback support

### Files Modified

1. **`app/server/src/api/arena.ts`**
   - Added `GET /api/arena/events` SSE endpoint
   - Added `GET /api/arena/events/status` for connection monitoring

2. **`app/server/src/index.ts`**
   - Initialize event bridge on startup
   - Cleanup event bridge on shutdown

3. **`app/shared/src/index.ts`**
   - Export event types

4. **`app/client/src/lib/api.ts`**
   - Added `arenaApi` with all arena endpoints

---

## API Endpoints Added

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/arena/events` | GET | SSE stream for real-time updates |
| `/api/arena/events/status` | GET | Number of connected SSE clients |

---

## Event Types

| Event | When Fired | Key Data |
|-------|-----------|----------|
| `connected` | Client connects | timestamp, message |
| `state_snapshot` | After connect | Full current state |
| `session:created` | New session | sessionId, totalRounds |
| `session:started` | Session starts | sessionId |
| `session:paused` | Session paused | sessionId |
| `session:completed` | Session ends | sessionId |
| `session:failed` | Session error | sessionId, error |
| `round:started` | Round begins | roundId, roundNumber, masterId |
| `round:completed` | Round ends | roundId, scores |
| `step:started` | Step begins | stepId, stepType, actorId |
| `step:completed` | Step ends | stepId, output |

---

## Usage Examples

### Server-side

```typescript
import { initializeEventBridge } from './services/event-bridge.js';

// Initialize on server startup
initializeEventBridge();
```

### Client-side

```typescript
import { useArenaEvents } from './hooks/useArenaEvents';

function ArenaPage() {
  const { isConnected, reconnect } = useArenaEvents({
    onStateSnapshot: (data) => console.log('State:', data),
    onStepCompleted: (data) => console.log('Step done:', data),
    onRoundCompleted: (data) => console.log('Round done:', data.scores),
  });

  return (
    <div>
      <span>Connected: {isConnected ? '✓' : '✗'}</span>
    </div>
  );
}
```

### Testing with curl

```bash
# Watch SSE events
curl -N http://localhost:3000/api/arena/events

# Check connected clients
curl http://localhost:3000/api/arena/events/status

# Create session and trigger steps
curl -X POST http://localhost:3000/api/arena/sessions \
  -H "Content-Type: application/json" \
  -d '{"totalRounds": 1}'

curl -X POST http://localhost:3000/api/arena/trigger \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Verified Working

Tested SSE flow with 2 free models:

1. **Connection Events:**
   - `connected` - Initial acknowledgment ✅
   - `state_snapshot` - Full state sent ✅

2. **Game Events:**
   - `round:started` - With master info ✅
   - `step:started` - For each step ✅
   - `step:completed` - With output data ✅

3. **Client Management:**
   - Client count accurate ✅
   - Multiple clients supported ✅
   - Disconnect cleanup works ✅

---

## Completion Checklist

Before moving to Phase 3:

- [x] SSE endpoint `/api/arena/events` works
- [x] Events broadcast to all connected clients
- [x] Client hook handles connection/reconnection
- [x] Heartbeat keeps connections alive
- [x] Event types shared between client/server
- [x] State snapshot sent on connect
- [x] All game events reach frontend
- [x] TanStack Query caches invalidated appropriately
- [x] Multiple clients work simultaneously
- [x] Tab visibility reconnection works

---

**Next Phase:** See `PHASE_3_ARENA_UI.md` for the public arena frontend.
