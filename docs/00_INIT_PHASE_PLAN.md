# SABE Init Phase - Complete Implementation Plan

**Version:** 1.0
**Date:** 2025-11-24
**Status:** Ready for Implementation
**Purpose:** Initialize project foundation with modern 2025 stack

---

## Executive Summary

This document provides the complete implementation plan for the **initialization phase** of SABE (Système Autonome de Benchmarking Évolutif). The goal is to create a solid, scalable foundation with all modern libraries configured and a working "Hello World" accessible in the browser.

### Key Outcomes
- ✅ Modern PHP 8.4 + Symfony 7.2 foundation
- ✅ Docker development environment with FrankenPHP
- ✅ PostgreSQL 17 + TimescaleDB for time-series data
- ✅ React + Vite frontend with data visualization libraries
- ✅ DDD-based project structure
- ✅ Complete documentation for AI agents
- ✅ Working "Hello World" in browser

---

## Technology Stack (2025 Best Practices)

### Backend Stack
| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| **Runtime** | PHP | 8.4 | Latest JIT improvements (7-70% faster) |
| **Framework** | Symfony | 7.2+ | Modern API-first framework |
| **API Layer** | API Platform | 4.2 | Auto-generated REST/GraphQL APIs |
| **Web Server** | FrankenPHP | Latest | 4x faster than PHP-FPM, worker mode |
| **Database** | PostgreSQL | 17 | Enterprise-grade, JSONB, full-text search |
| **Time-Series** | TimescaleDB | Latest | Purpose-built for time-series data |
| **Cache/Queue** | Valkey/Redis | 8+ | In-memory data store |
| **Job Queue** | Symfony Messenger | Built-in | Async processing |
| **Scheduler** | Symfony Scheduler | Built-in | Cron-like scheduling, Docker-friendly |
| **HTTP Client** | Symfony HttpClient | Built-in | Better than Guzzle for retry/rate limiting |

### Frontend Stack
| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| **Framework** | React | 18+ | Largest ecosystem for data visualization |
| **Language** | TypeScript | 5+ | Type safety |
| **Build Tool** | Vite | 5+ | 15x faster than Webpack |
| **State (Server)** | TanStack Query | 5+ | API data fetching/caching |
| **State (Client)** | Zustand | 5+ | Minimal boilerplate |
| **Charts** | Apache ECharts | 5+ | Enterprise-grade, WebGL rendering |
| **Tables** | TanStack Table | 8+ | Headless, powerful |
| **Real-time** | SSE (native) | - | Simpler than WebSocket for dashboards |

### Development Tools
| Tool | Purpose |
|------|---------|
| **Docker** | Containerization |
| **Composer** | PHP dependency management |
| **npm** | Frontend dependency management |
| **Pest PHP** | Testing framework (modern syntax) |
| **PHPStan** | Static analysis |
| **Deptrac** | Architecture boundary enforcement |

---

## Project Structure

Based on Domain-Driven Design with Bounded Contexts:

```
benchmark/
├── backend/                          # Symfony API
│   ├── src/
│   │   ├── Providers/               # Bounded Context 1
│   │   ├── Models/                  # Bounded Context 2
│   │   ├── Benchmarks/              # Bounded Context 3
│   │   ├── Execution/               # Bounded Context 4
│   │   ├── Evaluation/              # Bounded Context 5
│   │   ├── Rankings/                # Bounded Context 6
│   │   ├── TemporalAnalysis/        # Bounded Context 7
│   │   └── Shared/                  # Shared Kernel
│   ├── tests/
│   ├── config/
│   ├── migrations/
│   ├── var/
│   ├── public/
│   └── composer.json
│
├── frontend/                        # React SPA
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api/                     # TanStack Query hooks
│   │   ├── stores/                  # Zustand stores
│   │   └── types/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                            # AI-optimized documentation
│   ├── CLAUDE.md                    # Primary AI agent knowledge base
│   ├── 00_INIT_PHASE_PLAN.md       # This file
│   ├── 01_PROJECT_OVERVIEW.md       # High-level architecture
│   ├── 02_ARCHITECTURE.md           # Detailed architecture
│   ├── bounded-contexts/            # Per-context docs
│   ├── decisions/                   # ADRs
│   └── diagrams/                    # Visual architecture
│
├── docker/                          # Docker configuration
│   ├── frankenphp/
│   ├── postgres/
│   └── redis/
│
├── docker-compose.yml
├── .gitignore
├── .env
└── README.md
```

---

## Implementation Phases

### Phase 0: Prerequisites ✅
**Duration:** 15 minutes

**Actions:**
1. Verify Docker and Docker Compose installed
2. Verify Git installed
3. Verify Node.js 20+ and npm installed
4. Verify Composer installed

**Validation:**
```bash
docker --version          # Should be 20.10+
docker compose version    # Should be 2.0+
git --version
node --version            # Should be 20+
npm --version
composer --version        # Should be 2.5+
```

---

### Phase 1: Backend Foundation
**Duration:** 1-2 hours
**Goal:** Working Symfony API with Docker

#### 1.1 Create Symfony Project
```bash
# Create backend directory
mkdir -p backend
cd backend

# Install Symfony 7.2 with all required dependencies
composer create-project symfony/skeleton:"7.2.*" .

# Install essential packages
composer require symfony/runtime
composer require api-platform/core:"^4.2"
composer require symfony/orm-pack
composer require symfony/messenger
composer require symfony/scheduler-pack
composer require symfony/http-client
composer require symfony/rate-limiter
composer require symfony/validator
composer require symfony/uid
composer require symfony/monolog-bundle
composer require lexik/jwt-authentication-bundle

# Dev dependencies
composer require --dev symfony/maker-bundle
composer require --dev symfony/profiler-pack
composer require --dev symfony/test-pack
composer require --dev pestphp/pest:"^3.0"
composer require --dev pestphp/pest-plugin-symfony
composer require --dev phpstan/phpstan:"^1.10"
composer require --dev qossmic/deptrac:"^2.0"
```

#### 1.2 Configure Environment
```bash
# Create .env.local
cat > .env.local << 'EOF'
APP_ENV=dev
APP_SECRET=changeThisToARandomSecretValue

DATABASE_URL="postgresql://sabe:sabe@postgres:5432/sabe?serverVersion=17&charset=utf8"
MESSENGER_TRANSPORT_DSN=redis://redis:6379/messages
REDIS_URL=redis://redis:6379

CORS_ALLOW_ORIGIN='^http://localhost:5173$'
EOF
```

#### 1.3 Create Docker Setup
```bash
# Return to project root
cd ..

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  frankenphp:
    image: dunglas/frankenphp:latest-php8.4
    container_name: sabe_frankenphp
    restart: unless-stopped
    ports:
      - "8000:80"
      - "8443:443"
    volumes:
      - ./backend:/app
      - ./docker/frankenphp/Caddyfile:/etc/caddy/Caddyfile
    environment:
      SERVER_NAME: :80
      FRANKENPHP_CONFIG: worker ./public/index.php
    depends_on:
      - postgres
      - redis
    networks:
      - sabe

  postgres:
    image: timescale/timescaledb:latest-pg17
    container_name: sabe_postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: sabe
      POSTGRES_USER: sabe
      POSTGRES_PASSWORD: sabe
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - sabe

  redis:
    image: valkey/valkey:latest
    container_name: sabe_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - sabe

  messenger_worker:
    image: dunglas/frankenphp:latest-php8.4
    container_name: sabe_messenger
    restart: unless-stopped
    command: php bin/console messenger:consume async -vv
    volumes:
      - ./backend:/app
    depends_on:
      - postgres
      - redis
    networks:
      - sabe

volumes:
  postgres_data:
  redis_data:

networks:
  sabe:
    driver: bridge
EOF

# Create docker directories
mkdir -p docker/frankenphp docker/postgres
```

#### 1.4 Create Caddyfile for FrankenPHP
```bash
cat > docker/frankenphp/Caddyfile << 'EOF'
{
    frankenphp {
        worker ./public/index.php 2
    }
}

:80 {
    root * public
    encode zstd br gzip
    php_server
}
EOF
```

#### 1.5 Create PostgreSQL Init Script
```bash
cat > docker/postgres/init.sql << 'EOF'
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable JSONB functions
CREATE EXTENSION IF NOT EXISTS btree_gin;
EOF
```

#### 1.6 Start Docker Services
```bash
docker compose up -d
docker compose ps  # Verify all services are running
```

---

### Phase 2: Backend Structure
**Duration:** 30 minutes
**Goal:** Create DDD directory structure

#### 2.1 Create Bounded Context Directories
```bash
cd backend/src

# Create all bounded contexts
mkdir -p Providers/{Application,Domain,Infrastructure,Presentation,Contracts}
mkdir -p Models/{Application,Domain,Infrastructure,Presentation,Contracts}
mkdir -p Benchmarks/{Application,Domain,Infrastructure,Presentation,Contracts}
mkdir -p Execution/{Application,Domain,Infrastructure,Presentation,Contracts}
mkdir -p Evaluation/{Application,Domain,Infrastructure,Presentation,Contracts}
mkdir -p Rankings/{Application,Domain,Infrastructure,Presentation,Contracts}
mkdir -p TemporalAnalysis/{Application,Domain,Infrastructure,Presentation,Contracts}
mkdir -p Shared/{Domain,Application,Infrastructure}

# Create subdirectories for Providers (template for other contexts)
mkdir -p Providers/Application/{Command,Query,Event,EventHandler,Port,Service}
mkdir -p Providers/Domain/{Model,ValueObject,Repository,Service,Exception,Event}
mkdir -p Providers/Infrastructure/{Persistence,ApiClient,Http,Messaging}
mkdir -p Providers/Presentation/{Api,Cli}
```

#### 2.2 Create Hello World Controller
```bash
# Create a simple API controller to verify setup
cat > Providers/Infrastructure/Http/HealthCheckController.php << 'EOF'
<?php

declare(strict_types=1);

namespace App\Providers\Infrastructure\Http;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class HealthCheckController
{
    #[Route('/api/health', name: 'api_health', methods: ['GET'])]
    public function __invoke(): JsonResponse
    {
        return new JsonResponse([
            'status' => 'ok',
            'message' => 'SABE API is running!',
            'version' => '1.0.0',
            'timestamp' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM)
        ]);
    }
}
EOF
```

#### 2.3 Configure CORS
```bash
cd ../..  # Return to backend root

# Install CORS bundle
composer require nelmio/cors-bundle

# Configure CORS
cat > config/packages/nelmio_cors.yaml << 'EOF'
nelmio_cors:
    defaults:
        origin_regex: true
        allow_origin: ['%env(CORS_ALLOW_ORIGIN)%']
        allow_methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
        allow_headers: ['Content-Type', 'Authorization', 'X-Requested-With']
        expose_headers: ['Link']
        max_age: 3600
    paths:
        '^/api/':
            allow_origin: ['*']
            allow_headers: ['*']
            allow_methods: ['POST', 'PUT', 'GET', 'DELETE', 'PATCH', 'OPTIONS']
            max_age: 3600
EOF
```

#### 2.4 Test Backend
```bash
# Access health check endpoint
curl http://localhost:8000/api/health

# Expected response:
# {"status":"ok","message":"SABE API is running!","version":"1.0.0","timestamp":"..."}
```

---

### Phase 3: Frontend Foundation
**Duration:** 30 minutes
**Goal:** Working React + Vite app with TypeScript

#### 3.1 Create React Project
```bash
# Return to project root
cd ../..

# Create frontend with Vite
npm create vite@latest frontend -- --template react-ts

cd frontend
```

#### 3.2 Install Dependencies
```bash
# Core dependencies
npm install \
  @tanstack/react-query \
  @tanstack/react-table \
  zustand \
  echarts \
  echarts-for-react \
  react-router-dom \
  axios

# Dev dependencies
npm install --save-dev \
  @types/node \
  @vitejs/plugin-react
```

#### 3.3 Configure Vite for API Proxy
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
```

#### 3.4 Create Basic App Structure
```bash
# Create directory structure
mkdir -p src/{components,pages,api,stores,types}
```

#### 3.5 Create API Client
```typescript
// src/api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// src/api/health.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

interface HealthResponse {
  status: string;
  message: string;
  version: string;
  timestamp: string;
}

export const useHealthCheck = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { data } = await apiClient.get<HealthResponse>('/health');
      return data;
    },
  });
};
```

#### 3.6 Create Hello World Page
```typescript
// src/pages/Dashboard.tsx
import { useHealthCheck } from '../api/health';

export const Dashboard = () => {
  const { data, isLoading, error } = useHealthCheck();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>🚀 SABE - LLM Benchmarking Platform</h1>
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: '#f0f0f0',
        borderRadius: '8px'
      }}>
        <h2>API Health Check</h2>
        <p><strong>Status:</strong> {data?.status}</p>
        <p><strong>Message:</strong> {data?.message}</p>
        <p><strong>Version:</strong> {data?.version}</p>
        <p><strong>Timestamp:</strong> {data?.timestamp}</p>
      </div>
      <div style={{ marginTop: '2rem' }}>
        <h2>Technology Stack</h2>
        <ul>
          <li>✅ Symfony 7.2 + API Platform</li>
          <li>✅ PostgreSQL 17 + TimescaleDB</li>
          <li>✅ React 18 + TypeScript</li>
          <li>✅ Vite 5</li>
          <li>✅ TanStack Query</li>
          <li>✅ FrankenPHP</li>
        </ul>
      </div>
    </div>
  );
};
```

#### 3.7 Update App.tsx
```typescript
// src/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from './pages/Dashboard';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

export default App;
```

#### 3.8 Start Frontend
```bash
npm run dev
# Frontend runs at http://localhost:5173
```

#### 3.9 Test in Browser
Open `http://localhost:5173` - you should see:
- ✅ SABE Dashboard
- ✅ API health check data
- ✅ Technology stack list

---

### Phase 4: Documentation Structure
**Duration:** 45 minutes
**Goal:** Complete AI-optimized documentation

#### 4.1 Create CLAUDE.md (Primary AI Knowledge Base)
```bash
cd ../docs

cat > CLAUDE.md << 'EOF'
# SABE - AI Agent Knowledge Base

## System Overview
SABE (Système Autonome de Benchmarking Évolutif) is an autonomous LLM benchmarking platform that evaluates and tracks language model performance over time.

## Architecture
- **Pattern**: Domain-Driven Design with Bounded Contexts
- **Backend**: Symfony 7.2 + API Platform + PHP 8.4
- **Frontend**: React 18 + TypeScript + Vite
- **Database**: PostgreSQL 17 + TimescaleDB
- **Communication**: REST API + Server-Sent Events

## Bounded Contexts
1. **Providers**: LLM API connections (OpenRouter, OpenAI, Anthropic, Google)
2. **Models**: LLM catalog and metadata management
3. **Benchmarks**: Question banks, suites, tasks
4. **Execution**: Orchestrating benchmark runs
5. **Evaluation**: Scoring and judging responses
6. **Rankings**: Leaderboards and comparisons
7. **TemporalAnalysis**: Time-series data and trends

## Key Principles

### Domain Layer Rules
- MUST be framework-agnostic (no Symfony/Doctrine dependencies)
- Pure PHP business logic only
- Value Objects are immutable
- Aggregates enforce invariants
- Repository interfaces defined here, implementations in Infrastructure

### Application Layer
- Orchestrates use cases
- Commands (write operations) and Queries (read operations)
- Event handlers for cross-context communication
- No business logic - delegates to Domain

### Infrastructure Layer
- Doctrine repositories
- HTTP clients for external APIs
- Messaging implementations
- Framework-specific code

### Presentation Layer
- API controllers
- CLI commands
- Input validation
- Response serialization

## File Organization

### Commands
`{Context}/Application/Command/{CommandName}/{CommandName}Command.php`

Example: `Providers/Application/Command/CreateProvider/CreateProviderCommand.php`

### Queries
`{Context}/Application/Query/{QueryName}/{QueryName}Query.php`

Example: `Providers/Application/Query/GetProvider/GetProviderQuery.php`

### Entities
`{Context}/Domain/Model/{EntityName}.php`

Example: `Providers/Domain/Model/Provider.php`

### Value Objects
`{Context}/Domain/ValueObject/{VoName}.php`

Example: `Providers/Domain/ValueObject/ProviderId.php`

### Repositories
- Interface: `{Context}/Domain/Repository/{Name}RepositoryInterface.php`
- Implementation: `{Context}/Infrastructure/Persistence/Doctrine/Repository/Doctrine{Name}Repository.php`

## Testing Strategy

### Unit Tests (70%)
- Location: `tests/Unit/{Context}/Domain/`
- Test: Domain entities, value objects, domain services
- No framework, no database, pure PHP

### Integration Tests (20%)
- Location: `tests/Integration/{Context}/Infrastructure/`
- Test: Repository implementations, API clients
- Use KernelTestCase, real services from container

### Application Tests (10%)
- Location: `tests/Application/{Context}/`
- Test: Critical end-to-end flows
- Use WebTestCase, full HTTP cycle

## Common Patterns

### Creating an Entity
```php
// Domain/Model/Provider.php
namespace App\Providers\Domain\Model;

class Provider
{
    private function __construct(
        private ProviderId $id,
        private ProviderName $name,
        private ApiEndpoint $endpoint,
        private ConnectionStatus $status
    ) {}

    public static function create(
        ProviderId $id,
        ProviderName $name,
        ApiEndpoint $endpoint
    ): self {
        return new self($id, $name, $endpoint, ConnectionStatus::inactive());
    }

    // Business methods...
}
```

### Creating a Value Object
```php
// Domain/ValueObject/ProviderId.php
namespace App\Providers\Domain\ValueObject;

use Symfony\Component\Uid\Uuid;

final readonly class ProviderId
{
    private function __construct(private string $value)
    {
        if (!Uuid::isValid($value)) {
            throw new \InvalidArgumentException('Invalid Provider ID');
        }
    }

    public static function generate(): self
    {
        return new self(Uuid::v4()->toString());
    }

    public static function fromString(string $value): self
    {
        return new self($value);
    }

    public function toString(): string
    {
        return $this->value;
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }
}
```

### Creating a Command
```php
// Application/Command/CreateProvider/CreateProviderCommand.php
namespace App\Providers\Application\Command\CreateProvider;

final readonly class CreateProviderCommand
{
    public function __construct(
        public string $name,
        public string $endpoint,
        public array $credentials
    ) {}
}

// Application/Command/CreateProvider/CreateProviderHandler.php
namespace App\Providers\Application\Command\CreateProvider;

use App\Providers\Domain\Model\Provider;
use App\Providers\Domain\Repository\ProviderRepositoryInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final readonly class CreateProviderHandler
{
    public function __construct(
        private ProviderRepositoryInterface $repository
    ) {}

    public function __invoke(CreateProviderCommand $command): void
    {
        $provider = Provider::create(
            ProviderId::generate(),
            ProviderName::fromString($command->name),
            ApiEndpoint::fromString($command->endpoint)
        );

        $this->repository->save($provider);
    }
}
```

## Context Communication

### Via Events (Async)
```php
// Domain/Event/ProviderCreated.php
final readonly class ProviderCreated
{
    public function __construct(
        public string $providerId,
        public string $providerName,
        public \DateTimeImmutable $occurredAt
    ) {}
}

// In another context
#[AsEventListener]
final class WhenProviderCreatedThenNotify
{
    public function __invoke(ProviderCreated $event): void
    {
        // React to event
    }
}
```

### Via ACL (Anti-Corruption Layer)
```php
// Execution/Infrastructure/Integration/ProviderServiceAdapter.php
final class ProviderServiceAdapter
{
    public function getProvider(ProviderId $id): ProviderDto
    {
        // Translate from Providers context to Execution context
    }
}
```

## Development Workflow

1. Identify which bounded context owns the feature
2. Start with Domain layer (entities, VOs, business rules)
3. Add Application layer (commands/queries + handlers)
4. Implement Infrastructure adapters
5. Add Presentation layer (controllers)
6. Write tests (unit → integration → application)
7. Run deptrac to verify boundaries

## Common Commands

```bash
# Run tests
php bin/phpunit

# Run static analysis
vendor/bin/phpstan analyse

# Check architecture boundaries
vendor/bin/deptrac

# Create migration
php bin/console make:migration

# Run migrations
php bin/console doctrine:migrations:migrate

# Clear cache
php bin/console cache:clear

# Consume messages
php bin/console messenger:consume async -vv
```

## Important Notes

### DO ✅
- Keep aggregates small and focused
- Use value objects for type safety
- Write unit tests first for domain logic
- Use events for cross-context communication
- Keep domain layer pure PHP

### DON'T ❌
- Put Symfony/Doctrine annotations in domain entities
- Let repositories leak into domain layer
- Create circular dependencies between contexts
- Skip tests
- Put business logic in controllers

## Troubleshooting

### Issue: Database connection failed
- Check `DATABASE_URL` in `.env.local`
- Verify PostgreSQL container is running: `docker compose ps`
- Check logs: `docker compose logs postgres`

### Issue: CORS errors
- Verify `CORS_ALLOW_ORIGIN` in `.env.local`
- Check `nelmio_cors.yaml` configuration
- Ensure frontend is running on port 5173

### Issue: Messenger not consuming
- Verify Redis is running
- Check `MESSENGER_TRANSPORT_DSN` in `.env.local`
- Check worker logs: `docker compose logs messenger_worker`

## Next Steps

After initialization:
1. Implement Providers context (OpenRouter integration)
2. Create Models context (LLM catalog)
3. Build Benchmarks context (question banks)
4. Implement Execution orchestrator
5. Add Evaluation scoring engine
6. Create Rankings calculator
7. Build TemporalAnalysis for trends

For context-specific details, see:
- `docs/bounded-contexts/{context}.md`
- `docs/decisions/` for architecture decisions
- Tests in `tests/` for usage examples
EOF
```

#### 4.2 Create Project Overview
```bash
cat > 01_PROJECT_OVERVIEW.md << 'EOF'
# SABE - Project Overview

## What is SABE?

SABE (Système Autonome de Benchmarking Évolutif) is an autonomous platform for benchmarking Large Language Models (LLMs) over time.

## Problem Statement

- LLMs evolve continuously (new versions, silent updates)
- One-time benchmarks become outdated quickly
- Model selection decisions rely on anecdotal evidence
- No systematic tracking of performance trends

## Solution

An automated observatory that:
- Runs benchmarks on schedule (weekly, monthly)
- Tracks performance evolution over time
- Compares models across multiple dimensions
- Stores complete historical data
- Generates rankings and insights

## Core Features

### Autonomous Operation
- Scheduled benchmark campaigns
- Automatic retry on failures
- No manual intervention needed

### Multi-dimensional Evaluation
- Accuracy, reasoning, coding, creativity
- Speed (latency metrics)
- Cost (token usage)
- Stability (variance over time)

### Temporal Analysis
- Week-over-week comparisons
- Month-over-month trends
- Year-over-year evolution
- Anomaly detection

### Provider Agnostic
- OpenRouter (v1)
- Direct API support (future)
- Self-hosted models (future)

## Technology Decisions

### Why Symfony?
- Mature enterprise framework
- Excellent API tooling (API Platform)
- Built-in job scheduling (Symfony Scheduler)
- Strong async support (Messenger)
- Great testing tools

### Why DDD?
- Complex domain with many concepts
- Clear separation of concerns
- Testability and maintainability
- Scalability (can split into microservices later)

### Why PostgreSQL + TimescaleDB?
- TimescaleDB optimized for time-series data
- Automatic compression (90%+ space savings)
- Continuous aggregates (pre-computed stats)
- BRIN indexes for timestamps (99% smaller)
- JSONB for flexible metadata

### Why React?
- Largest ecosystem for data visualization
- Best charting libraries (ECharts, D3.js)
- Excellent table solutions (TanStack Table)
- Real-time updates support

## System Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │─────►│  Symfony API │─────►│ PostgreSQL  │
│ (React SPA) │      │  + API       │      │ TimescaleDB │
└─────────────┘      │  Platform    │      └─────────────┘
                     └──────────────┘
                            │
                     ┌──────┴───────┐
                     │              │
              ┌──────▼─────┐ ┌─────▼──────┐
              │ Messenger  │ │ Scheduler  │
              │  Workers   │ │  (Cron)    │
              └────────────┘ └────────────┘
                     │
              ┌──────▼─────────┐
              │  LLM Providers │
              │  (OpenRouter)  │
              └────────────────┘
```

## Bounded Contexts

1. **Providers**: Manage API connections
2. **Models**: LLM catalog and metadata
3. **Benchmarks**: Question banks and suites
4. **Execution**: Run benchmarks
5. **Evaluation**: Score responses
6. **Rankings**: Calculate leaderboards
7. **TemporalAnalysis**: Time-series insights

## Development Principles

- **Autonomy**: System runs without human intervention
- **Determinism**: Same input → same behavior
- **Separation**: Each concept isolated
- **Historization**: Nothing is lost
- **Extensibility**: Easy to add providers/features
- **Simplicity**: Complex inside, simple outside

## Deployment Strategy

### Development
- Docker Compose with FrankenPHP
- Local PostgreSQL + Redis
- Hot reload for frontend (Vite)

### Production (Future)
- Kubernetes or Docker Swarm
- Managed PostgreSQL (AWS RDS, etc.)
- Managed Redis (ElastiCache, etc.)
- CDN for frontend
- Horizontal scaling for workers

## Roadmap

### Phase 1 - Foundation (Current)
- ✅ Modern stack setup
- ✅ Docker environment
- ✅ DDD structure
- ✅ Hello World

### Phase 2 - Core Contexts
- Providers implementation
- Models catalog
- Benchmark management
- Basic execution

### Phase 3 - Evaluation
- LLM-as-judge integration
- Multi-dimensional scoring
- Automated evaluation

### Phase 4 - Analytics
- Rankings engine
- Temporal analysis
- Dashboard visualizations

### Phase 5 - Production
- Authentication/authorization
- API rate limiting
- Monitoring/alerting
- Production deployment

## Success Metrics

- ✅ Benchmark runs automatically every week
- ✅ Historical data retained indefinitely
- ✅ Rankings updated automatically
- ✅ < 5 minutes manual intervention per month
- ✅ Sub-second dashboard load times
- ✅ 99% uptime for scheduled jobs

## References

- Vision: `.claude/01_startProject/01_planClaude.md`
- Detailed Spec: `.claude/01_startProject/01_planGPT.md`
- Real Plan: `.claude/01_startProject/01_realPlan.md`
- Init Plan: `docs/00_INIT_PHASE_PLAN.md`
- AI Knowledge: `docs/CLAUDE.md`
EOF
```

#### 4.3 Create Bounded Context Documentation
```bash
mkdir -p bounded-contexts decisions diagrams

cat > bounded-contexts/providers.md << 'EOF'
# Providers Bounded Context

## Responsibility
Manage connections to LLM API providers (OpenRouter, OpenAI, Anthropic, Google).

## Core Concepts

### Aggregates
- **Provider**: Root entity representing an LLM API provider
  - API credentials (encrypted)
  - Rate limiting configuration
  - Connection status (active/inactive)
  - Health check status

### Value Objects
- **ProviderId**: UUID identifier
- **ProviderName**: String (validated)
- **ApiEndpoint**: URL (validated)
- **RateLimitConfig**: Requests per minute/hour
- **ConnectionStatus**: Enum (active, inactive, error)

### Domain Events
- **ProviderCreated**: New provider registered
- **ProviderConnectionFailed**: API connection failed
- **ProviderDeleted**: Provider removed
- **RateLimitExceeded**: Hit rate limit

## Use Cases

### Create Provider
```
User → CreateProviderCommand → Handler → Domain → Repository → Database
```

### Update API Key
```
User → UpdateApiKeyCommand → Handler → Domain → Vault → Repository
```

### Health Check
```
Scheduler → CheckHealthCommand → Handler → HTTP Client → Update Status
```

## External Dependencies
- **Vault**: Secure credential storage
- **HTTP Client**: API health checks
- **Event Bus**: Publish domain events

## Integration Points

### Consumed By
- **Execution**: Uses provider connections to run benchmarks
- **Models**: Links models to their providers

### Publishes
- ProviderCreated → Models context caches provider info
- ProviderConnectionFailed → Execution context pauses that provider

## Examples

See `tests/Integration/Providers/` for usage patterns.

## Common Queries
- List all active providers
- Get provider by ID
- Find providers supporting a specific model
EOF
```

---

### Phase 5: Configuration Files
**Duration:** 15 minutes
**Goal:** Complete configuration setup

#### 5.1 Create .gitignore
```bash
cd ../..  # Return to project root

cat > .gitignore << 'EOF'
# Backend
/backend/var/
/backend/vendor/
/backend/.env.local
/backend/.env.local.php
/backend/.env.*.local
/backend/public/bundles/
/backend/composer.lock

# Frontend
/frontend/node_modules/
/frontend/dist/
/frontend/.env.local
/frontend/package-lock.json

# Docker
/docker/postgres/data/
/docker/redis/data/

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
EOF
```

#### 5.2 Create README.md
```bash
cat > README.md << 'EOF'
# SABE - Système Autonome de Benchmarking Évolutif

Autonomous LLM benchmarking platform for tracking language model performance over time.

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Composer 2.5+

### Installation

```bash
# Clone repository
git clone <repo-url>
cd benchmark

# Start services
docker compose up -d

# Install backend dependencies
cd backend
composer install

# Install frontend dependencies
cd ../frontend
npm install

# Start frontend dev server
npm run dev
```

### Access

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api
- Health Check: http://localhost:8000/api/health

## Documentation

- [AI Agent Guide](docs/CLAUDE.md)
- [Project Overview](docs/01_PROJECT_OVERVIEW.md)
- [Init Phase Plan](docs/00_INIT_PHASE_PLAN.md)

## Technology Stack

### Backend
- PHP 8.4 + Symfony 7.2
- API Platform 4.2
- PostgreSQL 17 + TimescaleDB
- FrankenPHP
- Valkey/Redis

### Frontend
- React 18 + TypeScript
- Vite 5
- TanStack Query + Zustand
- Apache ECharts
- TanStack Table

## Project Structure

```
benchmark/
├── backend/          # Symfony API
├── frontend/         # React SPA
├── docs/             # Documentation
├── docker/           # Docker configs
└── docker-compose.yml
```

## Development

```bash
# Backend
docker compose logs frankenphp -f

# Frontend
cd frontend && npm run dev

# Run tests
cd backend && php bin/phpunit

# Check architecture
vendor/bin/deptrac
```

## License

MIT
EOF
```

---

### Phase 6: Verification & Testing
**Duration:** 15 minutes
**Goal:** Ensure everything works

#### 6.1 Verification Checklist

```bash
# 1. Docker services running
docker compose ps
# Expected: All services "Up"

# 2. Backend health check
curl http://localhost:8000/api/health
# Expected: JSON response with status "ok"

# 3. Frontend accessible
curl http://localhost:5173
# Expected: HTML response

# 4. PostgreSQL with TimescaleDB
docker compose exec postgres psql -U sabe -d sabe -c "SELECT extname FROM pg_extension;"
# Expected: timescaledb, uuid-ossp, btree_gin

# 5. Redis/Valkey
docker compose exec redis redis-cli PING
# Expected: PONG

# 6. Messenger worker running
docker compose logs messenger_worker
# Expected: Consumer started

# 7. Frontend connecting to API
# Open http://localhost:5173 in browser
# Expected: Dashboard showing API health data
```

---

## Success Criteria

### ✅ Backend
- [x] Symfony 7.2 installed with PHP 8.4
- [x] API Platform configured
- [x] FrankenPHP running
- [x] PostgreSQL + TimescaleDB running
- [x] Valkey/Redis running
- [x] Messenger worker running
- [x] Health check endpoint responding
- [x] CORS configured
- [x] DDD directory structure created

### ✅ Frontend
- [x] React + TypeScript + Vite setup
- [x] TanStack Query configured
- [x] API client with axios
- [x] Health check query working
- [x] Dashboard page displaying data
- [x] Dev server running with HMR

### ✅ Documentation
- [x] CLAUDE.md created
- [x] PROJECT_OVERVIEW.md created
- [x] Bounded context docs started
- [x] README.md created
- [x] Architecture documented

### ✅ Infrastructure
- [x] Docker Compose configured
- [x] FrankenPHP optimized
- [x] Database with extensions
- [x] Redis/Valkey for cache/queue
- [x] .gitignore configured

---

## Next Steps After Init

1. **Implement Providers Context**
   - OpenRouter API integration
   - Credential management with Vault
   - Rate limiting implementation
   - Health check scheduler

2. **Create Models Context**
   - LLM catalog CRUD
   - Model metadata management
   - Provider-Model relationships

3. **Build Benchmarks Context**
   - Question bank management
   - Suite creation and versioning
   - Task definition

4. **Execution Orchestrator**
   - Campaign scheduler
   - Benchmark runner
   - Result persistence

5. **Evaluation Engine**
   - Rule-based scoring
   - LLM-as-judge integration
   - Multi-dimensional evaluation

6. **Rankings Calculator**
   - Score aggregation
   - Leaderboard generation
   - Comparison logic

7. **Temporal Analysis**
   - Time-series queries
   - Trend detection
   - WoW/MoM comparisons

---

## Estimated Timeline

| Phase | Duration | Outcome |
|-------|----------|---------|
| Init (This) | 3-4 hours | Working foundation |
| Providers | 2 days | OpenRouter integration |
| Models | 1 day | LLM catalog |
| Benchmarks | 2 days | Question management |
| Execution | 3 days | Automated runs |
| Evaluation | 3 days | Scoring system |
| Rankings | 2 days | Leaderboards |
| TemporalAnalysis | 2 days | Trends |
| **Total MVP** | **~3 weeks** | Autonomous benchmarking |

---

## Troubleshooting

### Docker Issues
```bash
# Restart all services
docker compose down && docker compose up -d

# Rebuild containers
docker compose build --no-cache

# Check logs
docker compose logs -f
```

### Backend Issues
```bash
# Clear cache
docker compose exec frankenphp php bin/console cache:clear

# Check Symfony env
docker compose exec frankenphp php bin/console about

# Debug routes
docker compose exec frankenphp php bin/console debug:router
```

### Frontend Issues
```bash
# Clear node modules
cd frontend
rm -rf node_modules package-lock.json
npm install

# Check for port conflicts
lsof -i :5173
```

### Database Issues
```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U sabe -d sabe

# Check TimescaleDB
SELECT * FROM timescaledb_information.hypertables;

# Reset database
docker compose down -v
docker compose up -d
```

---

## Support & Resources

- **Architecture Decisions**: `docs/decisions/`
- **Bounded Contexts**: `docs/bounded-contexts/`
- **Tests**: `backend/tests/`
- **API Docs**: http://localhost:8000/api/docs (after API Platform setup)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-24
**Status:** Ready for Implementation ✅
