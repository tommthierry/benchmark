# Independent Stack Challenge & Analysis (2025)

**Date:** 2025-11-24
**Purpose:** Challenge the initial recommendations with fresh research and analysis
**Approach:** Start from project needs, not framework preferences

---

## Your Actual Project Requirements (From Specs)

Let me analyze what SABE **actually needs**:

1. **Scheduled jobs** - Run benchmarks weekly/monthly
2. **LLM API calls** - Make HTTP requests to OpenRouter, retry on failure
3. **Store results** - Save responses, timestamps, scores over time
4. **Rankings** - Calculate scores, compare across time
5. **Dashboard** - View results, charts, tables
6. **Autonomous** - Run without intervention

**Key insight:** This is NOT a complex enterprise app. It's a **data collection + analysis system**.

---

## 🔴 What I CHALLENGE from the Original Plan

### 1. **Domain-Driven Design = OVERKILL** ❌

**The Research Says:**
- [DDD is overkill](https://stackoverflow.com/questions/11727242/domain-driven-design-is-this-overkill) for CRUD-heavy apps
- [MVC vs DDD](https://harishkrishnan4u.medium.com/mvc-vs-ddd-a-comparative-analysis-of-architectural-patterns-6e91b2289e08): "DDD can be overkill for simple applications"
- [When to use DDD](https://dev.to/adrianbailador/introduction-to-net-architecture-patterns-mvc-mvp-mvvm-domain-driven-design-4i3f): "Best for complex systems where the business domain is extensive"

**Your Project Reality:**
- You have ~7 database tables (Provider, Model, Question, Run, Result, Score, Ranking)
- Business logic: Call API → Store response → Calculate score → Sort by score
- This is NOT "complex business domain" - it's data orchestration

**Verdict:** DDD adds **massive complexity** for **minimal benefit**

**Simpler Alternative:** Traditional MVC with Services layer
```
app/
├── Models/          # Eloquent/Doctrine models
├── Services/        # Business logic (BenchmarkRunner, ScoreCalculator)
├── Controllers/     # API endpoints
└── Jobs/            # Background tasks
```

---

### 2. **Symfony vs Laravel = Wrong Choice** ❌

**The Research Says:**
- [Symfony vs Laravel 2025](https://fnx.group/blog/article/symfony-vs-laravel-which-php-framework-should-you-choose-in-2025): "Laravel for rapid development, Symfony for enterprise"
- [Performance](https://www.bacancytechnology.com/blog/laravel-vs-symfony): "Laravel average 60ms, Symfony 250ms" (but varies)
- [Scheduling](https://laravel.com/docs/12.x/scheduling): Laravel has superior built-in scheduler
- [Jobs](https://laravel.com/docs/11.x/queues): Laravel queues are simpler than Symfony Messenger

**Your Project Reality:**
- You need: simple scheduling, background jobs, API calls
- Laravel does this out-of-the-box with less boilerplate
- Symfony requires more configuration for same features

**Verdict:** **Laravel wins** for your use case

**Why Laravel is Better Here:**
```php
// Laravel Scheduling (built-in, elegant)
$schedule->job(new RunBenchmark)->weekly();

// Symfony Scheduler (more complex, requires setup)
// Need to configure Messenger, create handler classes, etc.
```

---

### 3. **API Platform = TOO HEAVY** ❌

**The Research Says:**
- [API Platform alternatives](https://stackshare.io/api-platform/alternatives): "Laravel, Slim, Lumen for simpler needs"
- [Lightweight APIs](https://nordicapis.com/5-lightweight-php-frameworks-build-rest-apis/): "For simple APIs, avoid overhead"

**Your Project Reality:**
- You need: 5-10 REST endpoints (list models, run benchmark, get rankings)
- You DON'T need: GraphQL, JSON-LD, Hydra, auto-generated API docs

**Verdict:** API Platform is **feature bloat**

**Simpler Alternative:** Laravel API Resources or simple controllers

---

### 4. **React SPA = QUESTIONABLE** ⚠️

**The Research Says:**
- [React overkill](https://medium.com/@haryo.webapp/livewire-is-enough-most-of-the-time-save-react-for-the-fancy-stuff-b609bc045f77): "Livewire is enough most of the time"
- [HTMX simplicity](https://dev.to/turculaurentiu91/why-you-should-choose-htmx-for-your-next-project-o7j): "Focus on shipping features"
- [Inertia vs Livewire](https://kritimyantra.com/blogs/livewire-vs-inertiajs-in-2025-which-frontend-path-should-laravel-developers-choose): "Livewire for simple forms/tables"

**Your Project Reality:**
- Dashboard shows: tables (rankings), time-series charts, filters
- This is NOT heavily interactive (not Figma, not Google Docs)
- Server-rendered with sprinkles of interactivity = perfect use case

**Verdict:** Full React SPA is **probably overkill**, but **defensible** if you want modern UX

**Simpler Alternatives (in order of complexity):**

1. **Laravel Livewire** (Simplest - server-rendered, minimal JS)
   - Best if: You want to ship fast, don't need offline features
   - Renders server-side, updates via AJAX

2. **Inertia.js + Vue/React** (Middle ground - SPA feel, server routing)
   - Best if: You want SPA experience without API complexity
   - Uses Laravel routes, renders React/Vue components

3. **React SPA** (Most complex - full separation)
   - Best if: You plan to add mobile apps, need offline-first, or complex client state
   - Requires CORS, API tokens, more moving parts

**My Recommendation:** Start with **Inertia.js + React** (best of both worlds)

---

### 5. **TimescaleDB = WORTH IT** ✅

**The Research Says:**
- [TimescaleDB vs PostgreSQL](https://www.tigerdata.com/blog/postgresql-timescaledb-1000x-faster-queries-90-data-compression-and-much-more): "1000x faster queries, 90% compression"
- [When it's worth it](https://maddevs.io/writeups/time-series-data-management-with-timescaledb/): Time-based queries 5-14,000x faster
- [Small overhead](https://medium.com/timescale/timescaledb-vs-6a696248104e): "Few milliseconds for simple queries"

**Your Project Reality:**
- Core queries: "Show ranking trend over last 6 months"
- This IS time-series data (scores indexed by timestamp)
- You'll have millions of rows eventually

**Verdict:** **KEEP TimescaleDB** - this is its sweet spot

---

### 6. **FrankenPHP = TOO NEW** ⚠️

**The Research Says:**
- [FrankenPHP performance](https://vulke.medium.com/frankenphp-vs-php-fpm-benchmarks-surprises-and-one-clear-winner-173231cb1ad5): "15,000 req/s vs 4,000 req/s"
- [Production stability](https://thinktoshare.com/blogs/frankenphp-guide): "PHP Foundation backing (May 2025)"
- [Trade-offs](https://vulke.medium.com/frankenphp-vs-php-fpm-part-3-cpu-memory-and-the-hidden-cost-of-doing-nothing-92bfee7b00a5): "Uses more memory, CPU even when idle"

**Your Project Reality:**
- This is an internal tool, not high-traffic production
- You prioritize: **stability > performance**
- Traditional nginx + PHP-FPM works fine

**Verdict:** **Too risky for v1** - stick with proven nginx + PHP-FPM

**Recommendation:** Use nginx + PHP 8.4-FPM (battle-tested, stable)

---

### 7. **Monorepo vs Separate = SEPARATE WINS** ✅

**The Research Says:**
- [Monorepo advice](https://softwareengineering.stackexchange.com/questions/417953/should-frontend-and-backend-be-on-separate-github-repos): "Start separate, merge later if needed"
- [Key factor](https://encore.dev/docs/ts/frontend/mono-vs-multi-repo): "Independent release intervals = separate repos"

**Your Project Reality:**
- Backend might deploy weekly (bug fixes, new providers)
- Frontend might deploy after features stabilize
- Different CI/CD pipelines make sense

**Verdict:** **Separate repos** (easier to start, can merge later)

---

## ✅ What I AGREE With from Original Plan

### 1. **PostgreSQL over MySQL** ✅
- Better for complex queries, JSONB support, time-series extensions
- MySQL has no TimescaleDB equivalent

### 2. **TypeScript for Frontend** ✅
- Type safety prevents bugs in data-heavy apps
- Good for charting libraries integration

### 3. **Vite over Webpack** ✅
- [15x faster dev server](https://dualite.dev/blog/vite-vs-webpack)
- Industry standard in 2025

### 4. **Redis/Valkey for Cache** ✅
- Fast, proven, works great with Laravel queues

### 5. **TanStack Query + Zustand** ✅
- Modern, lightweight state management
- Better than Redux (less boilerplate)

### 6. **Apache ECharts for Charts** ✅
- Enterprise-grade, handles time-series beautifully
- Better than D3 for standard charts

---

## 🎯 MY RECOMMENDED STACK (Challenging Original)

### Backend: **Laravel 11** (not Symfony)

**Why Laravel:**
- Built-in elegant scheduler (`$schedule->job()->weekly()`)
- Simpler queue system (Redis, no extra config)
- Less boilerplate for same functionality
- Better documentation, larger community
- Horizon for queue monitoring (huge win)

**Structure:**
```
backend/
├── app/
│   ├── Models/              # Eloquent models
│   ├── Services/            # Business logic
│   │   ├── BenchmarkRunner.php
│   │   ├── ScoreCalculator.php
│   │   └── RankingEngine.php
│   ├── Jobs/                # Background jobs
│   │   ├── RunBenchmark.php
│   │   └── CalculateRankings.php
│   ├── Http/
│   │   ├── Controllers/     # API endpoints
│   │   └── Resources/       # JSON transformers
│   └── Console/
│       └── Kernel.php       # Scheduler
├── database/
│   ├── migrations/
│   └── seeders/
├── routes/
│   └── api.php
└── tests/
```

**No DDD, no bounded contexts, no CQRS** - just clean MVC with Services.

---

### Frontend: **Inertia.js + React + TypeScript**

**Why Inertia (not full SPA):**
- SPA-like experience without API complexity
- Use Laravel routes (no CORS, no API tokens needed)
- Server-side routing + client-side rendering
- Can upgrade to full SPA later if needed

**Alternative paths:**
1. **Simplest:** Livewire + Alpine.js (fully server-rendered)
2. **Middle:** Inertia + React (recommended)
3. **Most complex:** Full React SPA (if you need mobile apps later)

---

### Database: **PostgreSQL 17 + TimescaleDB**

**Keep this** - it's perfect for your use case.

---

### Web Server: **Nginx + PHP 8.4-FPM** (not FrankenPHP)

**Why traditional stack:**
- Battle-tested, stable
- Better for internal tools (stability > performance)
- Can upgrade to FrankenPHP in 2026 when more mature

---

### State Management: **TanStack Query + Zustand**

**Keep this** - modern, lightweight, perfect.

---

### Charts: **Apache ECharts**

**Keep this** - enterprise-grade, handles time-series.

---

### Job Queue: **Laravel Queues + Redis**

**Simpler than Symfony Messenger:**
```php
// Dispatch job
RunBenchmark::dispatch($models);

// Monitor with Horizon
php artisan horizon
```

---

## 📊 Complexity Comparison

| Aspect | Original (Symfony + DDD) | My Proposal (Laravel + MVC) |
|--------|-------------------------|----------------------------|
| **Learning curve** | Steep | Moderate |
| **Lines of boilerplate** | ~2000 | ~500 |
| **Time to Hello World** | 4 hours | 30 minutes |
| **Files for 1 feature** | 8-12 files | 3-5 files |
| **Deployment complexity** | High | Low |
| **Community resources** | Medium | Large |
| **Good for team of 1-2?** | No | Yes |

---

## 🎯 Final Verdict

### CHALLENGED & CHANGED:
1. ❌ **DDD** → Simple MVC + Services
2. ❌ **Symfony** → Laravel
3. ❌ **API Platform** → Laravel API Resources
4. ⚠️ **React SPA** → Inertia.js + React (compromise)
5. ❌ **FrankenPHP** → Nginx + PHP-FPM

### AGREED & KEPT:
1. ✅ PostgreSQL + TimescaleDB
2. ✅ TypeScript
3. ✅ Vite
4. ✅ Redis/Valkey
5. ✅ TanStack Query + Zustand
6. ✅ Apache ECharts

---

## 💡 The "Right-Sized" Stack

```
┌─────────────────────────────────────────┐
│  Frontend: Inertia + React + TS + Vite │
│  Charts: ECharts | Tables: TanStack    │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Backend: Laravel 11 + PHP 8.4         │
│  Queue: Laravel Queues + Horizon       │
│  Scheduler: Built-in Task Scheduler    │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Database: PostgreSQL 17 + TimescaleDB │
│  Cache/Queue: Redis/Valkey             │
└─────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Server: Nginx + PHP 8.4-FPM + Docker  │
└─────────────────────────────────────────┘
```

---

## 🚀 Time to MVP Estimate

| Stack | Time to Working System | Complexity | Risk |
|-------|----------------------|------------|------|
| **Original (Symfony + DDD)** | 3-4 weeks | Very High | Medium |
| **My Proposal (Laravel + MVC)** | 1-2 weeks | Low | Low |

**Savings:** ~2 weeks, 60% less code, 80% less configuration

---

## 📚 Key Sources

### Laravel vs Symfony
- [Symfony vs Laravel 2025](https://fnx.group/blog/article/symfony-vs-laravel-which-php-framework-should-you-choose-in-2025)
- [Performance Comparison](https://www.bacancytechnology.com/blog/laravel-vs-symfony)
- [Developer Perspective](https://laravel70.wordpress.com/2025/07/30/laravel-vs-symfony-a-developers-perspective-in-2025/)

### DDD Criticism
- [DDD Overkill](https://stackoverflow.com/questions/11727242/domain-driven-design-is-this-overkill)
- [MVC vs DDD](https://harishkrishnan4u.medium.com/mvc-vs-ddd-a-comparative-analysis-of-architectural-patterns-6e91b2289e08)

### Frontend Simplification
- [Livewire vs React](https://medium.com/@haryo.webapp/livewire-is-enough-most-of-the-time-save-react-for-the-fancy-stuff-b609bc045f77)
- [Inertia vs Livewire 2025](https://kritimyantra.com/blogs/livewire-vs-inertiajs-in-2025-which-frontend-path-should-laravel-developers-choose)
- [HTMX Simplicity](https://dev.to/turculaurentiu91/why-you-should-choose-htmx-for-your-next-project-o7j)

### TimescaleDB
- [1000x Performance](https://www.tigerdata.com/blog/postgresql-timescaledb-1000x-faster-queries-90-data-compression-and-much-more)
- [TimescaleDB vs PostgreSQL](https://maddevs.io/writeups/time-series-data-management-with-timescaledb/)

### FrankenPHP
- [Performance Benchmarks](https://vulke.medium.com/frankenphp-vs-php-fpm-benchmarks-surprises-and-one-clear-winner-173231cb1ad5)
- [Production Considerations](https://vulke.medium.com/frankenphp-vs-php-fpm-part-3-cpu-memory-and-the-hidden-cost-of-doing-nothing-92bfee7b00a5)

### Repository Structure
- [Monorepo vs Separate](https://softwareengineering.stackexchange.com/questions/417953/should-frontend-and-backend-be-on-separate-github-repos)
- [Monorepo Complexity](https://nairihar.medium.com/monorepo-from-hate-to-love-97a866811ccc)

---

## 🎬 Conclusion

**The original stack was architected for a different project:**
- Enterprise-scale with multiple teams
- Complex business domain requiring DDD
- High-traffic needing FrankenPHP performance

**Your actual project is:**
- Solo developer or small team (2-3 people)
- Data orchestration, not complex business logic
- Internal tool, moderate traffic

**My recommendation: Go simpler, ship faster, iterate based on real needs.**

You can always add complexity later if truly needed. You cannot easily remove it once baked in.

**Remember:** The best code is the code you don't have to write.

---

**Decision Point:** Do you want to:
1. **Go with my simpler stack** (Laravel + MVC) → Ship in ~1-2 weeks
2. **Stick with original** (Symfony + DDD) → More future-proof but ~3-4 weeks
3. **Hybrid approach** (Symfony but simpler architecture)

Choose based on: **Your timeline, team size, and complexity tolerance.**
