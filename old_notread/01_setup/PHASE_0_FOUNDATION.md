# PHASE 0: Foundation Setup

**Status:** ✅ COMPLETED
**Completed:** 2025-11-28
**Goal:** Working monorepo with Docker, Express "Hello World", React "Hello World"

---

## Phase Objectives - ALL ACHIEVED

1. ✅ Monorepo structure with npm workspaces
2. ✅ Shared TypeScript configuration
3. ✅ Express 5.1 server returning JSON at `/api/health`
4. ✅ React 19.2 app with Vite 7 displaying "SABE"
5. ✅ Docker container running everything
6. ✅ Frontend served by Express in production mode

---

## Progress Tracker

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 0.1 | Create monorepo structure | ✅ COMPLETED | app/shared, app/server, app/client |
| 0.2 | Configure root package.json with workspaces | ✅ COMPLETED | npm workspaces configured |
| 0.3 | Create shared TypeScript config | ✅ COMPLETED | ES2022 target, NodeNext modules |
| 0.4 | Setup shared package | ✅ COMPLETED | @sabe/shared with types |
| 0.5 | Setup Express server | ✅ COMPLETED | Express 5.1, Pino logging |
| 0.6 | Setup React client with Vite | ✅ COMPLETED | React 19.2, Vite 7, TailwindCSS 4 |
| 0.7 | Create Dockerfile | ✅ COMPLETED | Multi-stage build |
| 0.8 | Create docker-compose.yml | ✅ COMPLETED | Health check configured |
| 0.9 | Verify everything works | ✅ COMPLETED | All tests passed |

---

## Actual Versions Used (November 2025)

| Package | Version | Notes |
|---------|---------|-------|
| Node.js | 20.x | Works fine (plan said 22) |
| Express | 5.1.0 | Stable, requires `{*path}` for wildcards |
| React | 19.2.0 | Latest stable |
| Vite | 7.2.4 | Latest (plan said 6.x) |
| TailwindCSS | 4.1.17 | CSS-first config |
| TypeScript | 5.9.3 | Latest stable |
| Pino | 10.1.0 | Structured logging |

---

## Key Implementation Notes

### Express 5 Breaking Changes
- Wildcard routes must use `{*path}` syntax, not `*`
- Example: `app.get('{*path}', handler)` for SPA fallback

### TailwindCSS 4 Changes
- CSS-first configuration: `@import "tailwindcss";`
- No `tailwind.config.js` needed for basic setup
- Uses `@tailwindcss/vite` plugin

### @sabe/shared Package
- Server uses it for types and constants
- Client duplicates types locally (Vite bundler limitation)
- Will add Zod schemas in Phase 1

---

## Files Created

```
benchmark/
├── package.json                 # Workspace root
├── tsconfig.json                # Base TS config
├── docker-compose.yml           # Production container
├── .gitignore                   # Git ignore rules
├── app/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts         # Types & constants
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts         # Express server
│   └── client/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           └── index.css
├── docker/
│   └── Dockerfile               # Multi-stage build
└── data/                        # SQLite (gitignored)
```

---

## Verification Results

All checks passed:
- [x] `npm install` works at root
- [x] `npm run build:shared` succeeds
- [x] `npm run build:server` succeeds
- [x] `npm run build:client` succeeds
- [x] Server responds at `http://localhost:3000/api/health`
- [x] React app loads and shows "SABE"
- [x] React app displays API health status
- [x] `docker compose build` succeeds
- [x] `docker compose up` starts container
- [x] `http://localhost:3000` works in Docker
- [x] Docker health check passes

---

## Commands Reference

```bash
# Install all dependencies
npm install

# Development
npm run build:shared    # Must build shared first
npm run dev            # Start server (port 3000)
npm run dev:client     # Start client (port 5173)

# Production
docker compose build   # Build container
docker compose up -d   # Run in background
docker compose down    # Stop container

# Verification
curl http://localhost:3000/api/health
```

---

## Next Phase

**→ PHASE_1_BACKEND_CORE.md** (Ready to start)

Phase 1 will add:
- Drizzle ORM with SQLite
- Database schema (8 tables)
- CRUD APIs for providers, models, questions
- Zod validation

---

## Troubleshooting

### Express 5 Wildcard Error
```
PathError: Missing parameter name at index 1: *
```
**Solution:** Use `{*path}` instead of `*` for wildcard routes.

### "Cannot find module '@sabe/shared'"
**Solution:** Run `npm run build:shared` before starting server.

### Port already in use
```bash
docker compose down
# or
lsof -i :3000
kill -9 <PID>
```
