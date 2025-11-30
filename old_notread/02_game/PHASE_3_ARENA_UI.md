# Phase 3: Public Arena Frontend

## Objective

Create a visually engaging, public-facing arena page where visitors can watch AI models compete in real-time. The design should be unique, polished, and deliberately avoid "AI-generated design" patterns.

## Prerequisites

- Phase 2 completed (SSE events streaming)
- `useArenaEvents` hook working
- All game state accessible via events and API

## Progress Tracker

| Step | Task | Status |
|------|------|--------|
| 3.1 | Design system setup (colors, typography, spacing) | ✅ COMPLETED |
| 3.2 | Create arena page layout structure | ✅ COMPLETED |
| 3.3 | Build circular model layout with SVG | ✅ COMPLETED |
| 3.4 | Implement model node component | ✅ COMPLETED |
| 3.5 | Add master crown indicator | ✅ COMPLETED |
| 3.6 | Create current step indicator | ✅ COMPLETED |
| 3.7 | Build question display panel | ✅ COMPLETED |
| 3.8 | Create model detail modal | ✅ COMPLETED |
| 3.9 | Implement Framer Motion animations | ✅ COMPLETED |
| 3.10 | Add round progress indicator | ✅ COMPLETED |
| 3.11 | Create live activity feed | ✅ COMPLETED |
| 3.12 | Mobile responsive adjustments | ✅ COMPLETED |
| 3.13 | Add /arena route and navigation | ✅ COMPLETED |

**Status Legend:** ⬜ NOT STARTED → 🟡 IN PROGRESS → ✅ COMPLETED

**Phase 3 Completed:** 2025-11-29

---

## Implementation Summary

### Files Created

1. **`app/client/src/styles/design-tokens.css`** (~55 lines)
   - CSS custom properties for colors, typography, spacing
   - Muted, sophisticated palette avoiding AI-generated patterns
   - Golden ratio typography scale

2. **`app/client/src/styles/animations.ts`** (~80 lines)
   - Framer Motion animation variants
   - Transitions for fade, slide, scale effects
   - Modal and feed item animations

3. **`app/client/src/pages/ArenaPage.tsx`** (~250 lines)
   - Main arena page with SSE integration
   - Local state management for display
   - Loading, empty, and connected states
   - Event handlers for all SSE event types

4. **`app/client/src/components/arena/ArenaCircle.tsx`** (~120 lines)
   - SVG-based circular layout for models
   - Dynamic positioning based on model count
   - Center status text display
   - Subtle connecting lines between nodes

5. **`app/client/src/components/arena/ModelNode.tsx`** (~130 lines)
   - Individual model node with state visualization
   - Thinking animation ring for active model
   - Master crown indicator (SVG path)
   - Status indicator dot with color coding

6. **`app/client/src/components/arena/QuestionPanel.tsx`** (~60 lines)
   - Current question display with animations
   - Topic badge and master attribution
   - Formatted topic names

7. **`app/client/src/components/arena/ActivityFeed.tsx`** (~80 lines)
   - Live scrolling event feed
   - Type-based color indicators
   - Animated entry/exit for items

8. **`app/client/src/components/arena/RoundProgress.tsx`** (~30 lines)
   - Animated progress bar
   - Round count display

9. **`app/client/src/components/arena/ModelDetailModal.tsx`** (~150 lines)
   - Modal for model answer and judgments
   - Fetches data via TanStack Query
   - Master indicator and score display

10. **`app/client/src/hooks/useArenaActivity.ts`** (~45 lines)
    - Hook for managing activity feed state
    - Add/clear activities with timestamps

### Files Modified

1. **`app/client/src/main.tsx`** - Import design tokens CSS
2. **`app/client/src/App.tsx`** - Add /arena route (standalone layout)
3. **`app/client/src/components/Layout.tsx`** - Add Arena nav link with Swords icon

### Dependencies Added

```bash
npm install framer-motion --workspace=@sabe/client
```

---

## Design System

### Color Palette

```css
--color-bg-primary: #0a0a0b;    /* Darkest background */
--color-bg-secondary: #111113;  /* Card backgrounds */
--color-bg-tertiary: #1a1a1d;   /* Elevated elements */
--color-accent: #3b82f6;        /* Single accent - blue */
--color-master: #f59e0b;        /* Gold for master */
--color-success: #22c55e;       /* Completed states */
--color-warning: #f59e0b;       /* Judging states */
```

### Typography Scale (Golden Ratio)

```css
--text-xs: 0.694rem;   /* 11.1px */
--text-sm: 0.833rem;   /* 13.3px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.2rem;     /* 19.2px */
--text-xl: 1.44rem;    /* 23px */
```

---

## Arena Page Features

### Real-time Updates

The arena page connects to SSE and handles these events:

| Event | Handler |
|-------|---------|
| `state_snapshot` | Sets initial full state |
| `round:started` | Resets model states, sets master |
| `step:started` | Updates current actor, shows thinking |
| `step:completed` | Updates model status, question/topic |
| `round:completed` | Updates completed count |

### Model States

| Status | Visual |
|--------|--------|
| `idle` | Gray node, muted dot |
| `thinking` | Blue node with rotating dash ring |
| `answered` | Elevated node with green border |
| `judging` | Yellow/warning border |
| `judged` | Green border, green dot |

### Layout

- **Mobile**: Single column, stacked layout
- **Desktop**: 7/5 grid (arena left, panels right)
- **Arena page**: Standalone (no sidebar)

---

## Component Architecture

```
ArenaPage
├── ConnectionStatus (isConnected indicator)
├── RoundProgress (completed/total bar)
├── ArenaCircle
│   └── ModelNode[] (clickable, animated)
├── QuestionPanel (topic, question, master)
├── ActivityFeed (live events)
└── ModelDetailModal (answer, judgments)
```

---

## Completion Checklist

Before considering Phase 3 complete:

- [x] Design tokens applied consistently
- [x] Arena page displays models in circle
- [x] Master has crown indicator
- [x] Active model shows thinking animation
- [x] Question panel updates in real-time
- [x] Activity feed shows live events
- [x] Model click opens detail modal
- [x] Animations are smooth and purposeful
- [x] Mobile responsive layout
- [x] Connection status indicator
- [x] Empty state handling
- [x] Loading state handling

---

## Design Review

**Avoiding AI-generated look:**
- [x] Muted color palette (no neon)
- [x] Asymmetric grid layout
- [x] Purposeful animations (convey state)
- [x] Clear typography hierarchy
- [x] Minimal icon usage
- [x] No generic illustrations
- [x] Subtle shadows and borders

**UX Quality:**
- [x] User knows connection status
- [x] Current step clearly indicated
- [x] Loading states are smooth
- [x] Model states clearly visible
- [x] Navigation to arena is accessible

---

## Testing

To test the arena page:

```bash
# Start the server
npm run dev

# In another terminal, start the client
npm run dev:client

# Open browser to http://localhost:5173/arena

# Create a session and trigger steps
curl -X POST http://localhost:3000/api/arena/sessions \
  -H "Content-Type: application/json" \
  -d '{"totalRounds": 2}'

curl -X POST http://localhost:3000/api/arena/trigger \
  -H "Content-Type: application/json" \
  -d '{}'
```

The arena page should:
1. Show "No Active Session" when no session exists
2. Show models in circle when session created
3. Animate steps as they execute
4. Update activity feed in real-time
5. Allow clicking models for detail modal

---

## Future Enhancements (Not in Phase 3)

The following were planned but deferred:

- **Admin model enable/disable**: Add toggle to Models page
- **Admin prompt template editor**: Create new admin page
- **Scoreboard/leaderboard**: Show cumulative rankings
- **Session history**: List past sessions with results

---

**Phase 3 Complete!**

The AI Arena now has a public-facing UI that:
1. Displays models in a circular arena layout
2. Shows real-time game state via SSE
3. Animates model states as they change
4. Provides detailed view on model click
5. Follows intentional design principles
