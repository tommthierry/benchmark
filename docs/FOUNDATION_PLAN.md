# SABE Foundation Plan - Fast & SOC2-Ready

**Version:** 1.0 - Final Recommendation
**Date:** 2025-11-24
**Goal:** Ship fast while maintaining enterprise-grade security
**Timeline:** 1-2 weeks to working system

---

## Executive Summary

This plan delivers a **minimal but production-ready foundation** that:
- ✅ Ships in 1-2 weeks (not 3-4)
- ✅ SOC2-ready security from day 1
- ✅ Zero hardcoded secrets
- ✅ Proper secrets management
- ✅ Scalable architecture
- ✅ Battle-tested stack

**Philosophy:** Start simple, but secure. Add complexity only when needed.

---

## Technology Stack (Final)

### Backend
| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Framework** | Laravel 11 | Faster development, better scheduling/queues |
| **PHP Version** | 8.4 | Latest features, JIT performance |
| **Architecture** | MVC + Services | Simple but maintainable (not DDD overkill) |
| **API Layer** | Laravel API Resources | Built-in, lightweight (not API Platform) |
| **Authentication** | Laravel Sanctum | SOC2-ready, token-based API auth |
| **Job Queue** | Laravel Queues + Redis | Simpler than Symfony Messenger |
| **Scheduler** | Laravel Task Scheduler | Built-in, cron-less |

### Frontend
| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Framework** | Inertia.js + React | SPA feel without API complexity |
| **Language** | TypeScript | Type safety |
| **Build Tool** | Vite 5 | 15x faster than Webpack |
| **State Management** | TanStack Query + Zustand | Modern, lightweight |
| **Charts** | Apache ECharts | Enterprise-grade time-series |
| **Tables** | TanStack Table | Powerful, headless |

### Infrastructure
| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Database** | PostgreSQL 17 + TimescaleDB | Perfect for time-series (1000x faster) |
| **Cache/Queue** | Redis 8 (Valkey) | Fast, proven |
| **Web Server** | Nginx + PHP 8.4-FPM | Battle-tested (FrankenPHP too new) |
| **Container** | Docker + Docker Compose | Development parity |
| **Secrets** | Docker Secrets + .env.encrypted | SOC2-compliant secrets management |

---

## Security-First Architecture

### SOC2 Compliance Requirements

Based on [Laravel's SOC2 certification](https://laravel.com/blog/laravel-cloud-achieves-soc-2-type-2-certification-nightwatch-and-forge-next) and [best practices](https://benjamincrozat.com/laravel-security-best-practices):

1. **Access Control** - API tokens, role-based access
2. **Encryption** - HTTPS everywhere, encrypted secrets
3. **Audit Logging** - Track all auth attempts, changes
4. **Secrets Management** - Never hardcode, rotate regularly
5. **Monitoring** - Track failures, unauthorized access

---

## Secrets Management Strategy

### Development
```bash
# .env (local only, never commit)
APP_KEY=base64:...
DB_PASSWORD=local_password
OPENROUTER_API_KEY=test_key
```

### Production
```bash
# Use Laravel's built-in encryption
php artisan env:encrypt --key=your-encryption-key

# Generates .env.encrypted (safe to commit)
# Decrypt on server with:
php artisan env:decrypt --key=your-encryption-key
```

**Alternative:** Docker Secrets (for Docker Swarm/Kubernetes)

```yaml
# docker-compose.prod.yml
services:
  app:
    secrets:
      - db_password
      - openrouter_key

secrets:
  db_password:
    external: true
  openrouter_key:
    external: true
```

**References:**
- [Laravel env encryption](https://blog.laravel.com/laravel-new-environment-encryption-commands)
- [Docker secrets for Laravel](https://github.com/corbosman/laravel-docker-secrets)
- [Vault integration](https://github.com/Polokij/laravel-vault-env)

---

## Project Structure

### Directory Layout
```
sabe/
├── backend/                      # Laravel 11 API
│   ├── app/
│   │   ├── Models/              # Eloquent models
│   │   │   ├── Provider.php
│   │   │   ├── LlmModel.php
│   │   │   ├── Question.php
│   │   │   ├── Benchmark.php
│   │   │   ├── BenchmarkRun.php
│   │   │   ├── TaskExecution.php
│   │   │   ├── Evaluation.php
│   │   │   └── Ranking.php
│   │   │
│   │   ├── Services/            # Business logic
│   │   │   ├── ProviderService.php
│   │   │   ├── BenchmarkRunner.php
│   │   │   ├── LlmClient.php
│   │   │   ├── ScoreCalculator.php
│   │   │   ├── RankingEngine.php
│   │   │   └── TemporalAnalyzer.php
│   │   │
│   │   ├── Jobs/                # Background jobs
│   │   │   ├── RunBenchmark.php
│   │   │   ├── EvaluateResponse.php
│   │   │   ├── CalculateRankings.php
│   │   │   └── PruneOldData.php
│   │   │
│   │   ├── Http/
│   │   │   ├── Controllers/     # API controllers
│   │   │   │   ├── ProviderController.php
│   │   │   │   ├── ModelController.php
│   │   │   │   ├── BenchmarkController.php
│   │   │   │   ├── RunController.php
│   │   │   │   └── RankingController.php
│   │   │   │
│   │   │   ├── Resources/       # JSON transformers
│   │   │   │   ├── ProviderResource.php
│   │   │   │   ├── ModelResource.php
│   │   │   │   └── RankingResource.php
│   │   │   │
│   │   │   ├── Requests/        # Form validation
│   │   │   │   ├── StoreProviderRequest.php
│   │   │   │   └── RunBenchmarkRequest.php
│   │   │   │
│   │   │   └── Middleware/
│   │   │       ├── EnsureApiToken.php
│   │   │       └── LogApiRequests.php
│   │   │
│   │   └── Console/
│   │       └── Kernel.php       # Task scheduler
│   │
│   ├── database/
│   │   ├── migrations/
│   │   │   ├── 2025_11_24_000001_create_providers_table.php
│   │   │   ├── 2025_11_24_000002_create_llm_models_table.php
│   │   │   ├── 2025_11_24_000003_create_questions_table.php
│   │   │   ├── 2025_11_24_000004_create_benchmarks_table.php
│   │   │   ├── 2025_11_24_000005_create_benchmark_runs_table.php
│   │   │   ├── 2025_11_24_000006_create_task_executions_table.php
│   │   │   ├── 2025_11_24_000007_create_evaluations_table.php
│   │   │   ├── 2025_11_24_000008_create_rankings_table.php
│   │   │   └── 2025_11_24_000009_setup_timescaledb.php
│   │   │
│   │   └── seeders/
│   │       ├── ProviderSeeder.php
│   │       └── QuestionSeeder.php
│   │
│   ├── routes/
│   │   ├── api.php              # API routes
│   │   └── console.php          # CLI commands
│   │
│   ├── tests/
│   │   ├── Feature/             # Integration tests
│   │   │   ├── ProviderTest.php
│   │   │   ├── BenchmarkTest.php
│   │   │   └── RankingTest.php
│   │   └── Unit/                # Unit tests
│   │       ├── Services/
│   │       │   ├── ScoreCalculatorTest.php
│   │       │   └── RankingEngineTest.php
│   │       └── Models/
│   │
│   ├── .env.example
│   ├── .env.encrypted           # Encrypted secrets (committed)
│   ├── composer.json
│   └── artisan
│
├── frontend/                     # Inertia + React
│   ├── src/
│   │   ├── Pages/               # Inertia pages
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Providers/
│   │   │   │   ├── Index.tsx
│   │   │   │   └── Create.tsx
│   │   │   ├── Models/
│   │   │   ├── Benchmarks/
│   │   │   ├── Runs/
│   │   │   └── Rankings/
│   │   │
│   │   ├── Components/
│   │   │   ├── Charts/
│   │   │   │   ├── TimeSeriesChart.tsx
│   │   │   │   ├── RankingChart.tsx
│   │   │   │   └── ComparisonChart.tsx
│   │   │   ├── Tables/
│   │   │   │   ├── ModelTable.tsx
│   │   │   │   └── RankingTable.tsx
│   │   │   └── Layout/
│   │   │       └── AppLayout.tsx
│   │   │
│   │   ├── Stores/              # Zustand stores
│   │   │   └── dashboardStore.ts
│   │   │
│   │   └── Types/               # TypeScript types
│   │       ├── models.ts
│   │       └── api.ts
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── docker/
│   ├── nginx/
│   │   └── default.conf
│   ├── php/
│   │   ├── Dockerfile
│   │   └── php.ini
│   └── postgres/
│       └── init.sql
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .gitignore
└── README.md
```

---

## Implementation Steps

### Phase 1: Backend Foundation (Day 1-2)

#### 1.1 Create Laravel Project
```bash
composer create-project laravel/laravel:^11.0 backend
cd backend

# Install core dependencies
composer require laravel/sanctum
composer require laravel/horizon  # Queue monitoring
composer require spatie/laravel-activitylog  # Audit logging
composer require guzzlehttp/guzzle  # HTTP client
```

#### 1.2 Configure Security
```bash
# Generate app key
php artisan key:generate

# Setup Sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"

# Encrypt environment
php artisan env:encrypt --env=production
```

#### 1.3 Configure Database
```yaml
# config/database.php
'pgsql' => [
    'driver' => 'pgsql',
    'host' => env('DB_HOST', '127.0.0.1'),
    'port' => env('DB_PORT', '5432'),
    'database' => env('DB_DATABASE', 'sabe'),
    'username' => env('DB_USERNAME', 'sabe'),
    'password' => env('DB_PASSWORD', ''),
    'charset' => 'utf8',
    'prefix' => '',
    'schema' => 'public',
    'sslmode' => 'prefer',
],
```

#### 1.4 Create Models
```bash
# Generate models with migrations
php artisan make:model Provider -m
php artisan make:model LlmModel -m
php artisan make:model Question -m
php artisan make:model Benchmark -m
php artisan make:model BenchmarkRun -m
php artisan make:model TaskExecution -m
php artisan make:model Evaluation -m
php artisan make:model Ranking -m
```

#### 1.5 Setup TimescaleDB
```sql
-- database/migrations/2025_11_24_000009_setup_timescaledb.php
CREATE EXTENSION IF NOT EXISTS timescaledb;
SELECT create_hypertable('task_executions', 'created_at');
SELECT create_hypertable('evaluations', 'created_at');
SELECT create_hypertable('rankings', 'created_at');
```

#### 1.6 Configure Queue
```bash
# Install Redis
composer require predis/predis

# .env
QUEUE_CONNECTION=redis
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379
```

#### 1.7 Setup Scheduler
```php
// app/Console/Kernel.php
protected function schedule(Schedule $schedule)
{
    // Run weekly benchmark
    $schedule->job(new RunBenchmark)->weekly()->mondays()->at('02:00');

    // Calculate rankings daily
    $schedule->job(new CalculateRankings)->daily()->at('03:00');

    // Prune old data monthly
    $schedule->job(new PruneOldData)->monthly();

    // Horizon snapshot every 5 minutes
    $schedule->command('horizon:snapshot')->everyFiveMinutes();
}
```

---

### Phase 2: Security Hardening (Day 2-3)

#### 2.1 API Authentication
```php
// config/sanctum.php
'expiration' => 60 * 24, // 24 hours
'middleware' => [
    'verify_csrf_token' => App\Http\Middleware\VerifyCsrfToken::class,
    'encrypt_cookies' => App\Http\Middleware\EncryptCookies::class,
],

// routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('providers', ProviderController::class);
    Route::apiResource('models', ModelController::class);
    Route::apiResource('benchmarks', BenchmarkController::class);
    Route::apiResource('runs', RunController::class);
    Route::get('rankings', [RankingController::class, 'index']);
});

// Generate tokens
$token = $user->createToken('api-token')->plainTextToken;
```

Reference: [Laravel Sanctum 2025](https://www.buanacoding.com/2025/09/laravel-api-authentication-sanctum-2025.html)

#### 2.2 Rate Limiting
```php
// app/Http/Kernel.php
protected $middlewareGroups = [
    'api' => [
        'throttle:60,1', // 60 requests per minute
        \Illuminate\Routing\Middleware\SubstituteBindings::class,
    ],
];

// Custom rate limiter
RateLimiter::for('api-strict', function (Request $request) {
    return Limit::perMinute(30)->by($request->user()?->id ?: $request->ip());
});
```

#### 2.3 CORS Configuration
```php
// config/cors.php
'paths' => ['api/*'],
'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:5173')],
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
'exposed_headers' => [],
'max_age' => 0,
'supports_credentials' => true,
```

#### 2.4 Audit Logging
```php
// Using spatie/laravel-activitylog
use Spatie\Activitylog\Traits\LogsActivity;

class Provider extends Model
{
    use LogsActivity;

    protected static $logAttributes = ['name', 'api_endpoint'];
    protected static $logOnlyDirty = true;
}

// Log manual activities
activity()
    ->causedBy($user)
    ->performedOn($provider)
    ->withProperties(['ip' => $request->ip()])
    ->log('Provider created');
```

Reference: [Laravel Security Best Practices](https://mallow-tech.com/blog/14-best-security-practices-to-follow-for-your-laravel-application/)

#### 2.5 Input Validation
```php
// app/Http/Requests/StoreProviderRequest.php
public function rules()
{
    return [
        'name' => 'required|string|max:255|unique:providers',
        'api_endpoint' => 'required|url',
        'api_key' => 'required|string|min:32',
        'rate_limit' => 'integer|min:1|max:1000',
    ];
}

public function messages()
{
    return [
        'api_key.min' => 'API key must be at least 32 characters for security',
    ];
}
```

#### 2.6 Secrets Encryption
```php
// Use encrypted casting for sensitive fields
class Provider extends Model
{
    protected $casts = [
        'api_key' => 'encrypted',
        'config' => 'encrypted:array',
    ];
}
```

---

### Phase 3: Frontend Setup (Day 3-4)

#### 3.1 Install Inertia.js
```bash
cd backend

# Install server-side
composer require inertiajs/inertia-laravel

# Publish middleware
php artisan inertia:middleware

# Add to Kernel.php
'web' => [
    // ...
    \App\Http\Middleware\HandleInertiaRequests::class,
],
```

#### 3.2 Setup Frontend
```bash
cd ..
npm create vite@latest frontend -- --template react-ts

cd frontend

# Install dependencies
npm install \
  @inertiajs/react \
  @tanstack/react-query \
  zustand \
  echarts \
  echarts-for-react \
  @tanstack/react-table \
  axios

# Install dev dependencies
npm install --save-dev @types/node
```

#### 3.3 Configure Vite
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
  plugins: [
    laravel({
      input: ['resources/js/app.tsx'],
      refresh: true,
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@': '/resources/js',
    },
  },
});
```

#### 3.4 Create Inertia App
```typescript
// resources/js/app.tsx
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./Pages/**/*.tsx', { eager: true });
    return pages[`./Pages/${name}.tsx`];
  },
  setup({ el, App, props }) {
    createRoot(el).render(
      <QueryClientProvider client={queryClient}>
        <App {...props} />
      </QueryClientProvider>
    );
  },
});
```

#### 3.5 Create Dashboard Page
```typescript
// resources/js/Pages/Dashboard.tsx
import { Head } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';

interface DashboardProps {
  auth: {
    user: User;
  };
}

export default function Dashboard({ auth }: DashboardProps) {
  const { data: rankings } = useQuery({
    queryKey: ['rankings'],
    queryFn: () => fetch('/api/rankings').then(r => r.json()),
  });

  return (
    <>
      <Head title="Dashboard" />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">
          LLM Benchmark Dashboard
        </h1>

        {/* Time series chart */}
        <ReactECharts
          option={{
            title: { text: 'Model Performance Over Time' },
            xAxis: { type: 'time' },
            yAxis: { type: 'value' },
            series: rankings?.map(r => ({
              name: r.model_name,
              type: 'line',
              data: r.scores,
            })),
          }}
        />
      </div>
    </>
  );
}
```

---

### Phase 4: Docker Setup (Day 4-5)

#### 4.1 Create Dockerfiles
```dockerfile
# docker/php/Dockerfile
FROM php:8.4-fpm

# Install dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    libzip-dev \
    zip \
    unzip \
    git

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_pgsql zip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy application
COPY backend /var/www/html

# Install dependencies
RUN composer install --optimize-autoloader --no-dev

# Set permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

USER www-data
```

#### 4.2 Create docker-compose.yml
```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: sabe_nginx
    ports:
      - "80:80"
    volumes:
      - ./backend:/var/www/html
      - ./docker/nginx/default.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - php
    networks:
      - sabe

  php:
    build:
      context: .
      dockerfile: docker/php/Dockerfile
    container_name: sabe_php
    volumes:
      - ./backend:/var/www/html
    environment:
      - DB_HOST=postgres
      - DB_DATABASE=sabe
      - DB_USERNAME=sabe
      - DB_PASSWORD=sabe
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    networks:
      - sabe

  postgres:
    image: timescale/timescaledb:latest-pg17
    container_name: sabe_postgres
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
    image: redis:8-alpine
    container_name: sabe_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - sabe

  horizon:
    build:
      context: .
      dockerfile: docker/php/Dockerfile
    container_name: sabe_horizon
    command: php artisan horizon
    volumes:
      - ./backend:/var/www/html
    depends_on:
      - postgres
      - redis
    networks:
      - sabe

  scheduler:
    build:
      context: .
      dockerfile: docker/php/Dockerfile
    container_name: sabe_scheduler
    command: php artisan schedule:work
    volumes:
      - ./backend:/var/www/html
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
```

#### 4.3 Nginx Configuration
```nginx
# docker/nginx/default.conf
server {
    listen 80;
    server_name localhost;
    root /var/www/html/public;

    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass php:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }
}
```

---

### Phase 5: Core Services (Day 5-7)

#### 5.1 Provider Service
```php
// app/Services/ProviderService.php
namespace App\Services;

use App\Models\Provider;
use Illuminate\Support\Facades\Http;

class ProviderService
{
    public function testConnection(Provider $provider): bool
    {
        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $provider->api_key,
                ])
                ->get($provider->api_endpoint . '/models');

            return $response->successful();
        } catch (\Exception $e) {
            activity()
                ->performedOn($provider)
                ->withProperties(['error' => $e->getMessage()])
                ->log('Connection test failed');

            return false;
        }
    }

    public function listModels(Provider $provider): array
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $provider->api_key,
        ])->get($provider->api_endpoint . '/models');

        return $response->json('data', []);
    }
}
```

#### 5.2 LLM Client
```php
// app/Services/LlmClient.php
namespace App\Services;

use App\Models\LlmModel;
use App\Models\Question;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;

class LlmClient
{
    public function sendPrompt(
        LlmModel $model,
        Question $question,
        array $config = []
    ): array {
        // Rate limiting
        $key = 'llm-request:' . $model->provider_id;

        if (!RateLimiter::attempt($key, $model->provider->rate_limit ?? 60, function() {})) {
            throw new \Exception('Rate limit exceeded for provider');
        }

        // Send request
        $response = Http::timeout(120)
            ->retry(3, 1000) // 3 retries with 1s delay
            ->withHeaders([
                'Authorization' => 'Bearer ' . $model->provider->api_key,
                'Content-Type' => 'application/json',
            ])
            ->post($model->provider->api_endpoint . '/chat/completions', [
                'model' => $model->provider_model_id,
                'messages' => [
                    ['role' => 'user', 'content' => $question->content],
                ],
                'temperature' => $config['temperature'] ?? 0.7,
                'max_tokens' => $config['max_tokens'] ?? 1000,
            ]);

        if (!$response->successful()) {
            throw new \Exception('LLM request failed: ' . $response->body());
        }

        $data = $response->json();

        return [
            'content' => $data['choices'][0]['message']['content'] ?? '',
            'tokens_input' => $data['usage']['prompt_tokens'] ?? 0,
            'tokens_output' => $data['usage']['completion_tokens'] ?? 0,
            'response_time_ms' => $response->transferStats?->getTransferTime() * 1000,
            'raw_response' => $data,
        ];
    }
}
```

#### 5.3 Benchmark Runner
```php
// app/Services/BenchmarkRunner.php
namespace App\Services;

use App\Models\Benchmark;
use App\Models\BenchmarkRun;
use App\Models\TaskExecution;
use App\Jobs\EvaluateResponse;
use Illuminate\Support\Facades\DB;

class BenchmarkRunner
{
    public function __construct(
        private LlmClient $llmClient,
    ) {}

    public function run(Benchmark $benchmark): BenchmarkRun
    {
        $run = BenchmarkRun::create([
            'benchmark_id' => $benchmark->id,
            'status' => 'running',
            'started_at' => now(),
        ]);

        try {
            DB::transaction(function () use ($benchmark, $run) {
                // For each model
                foreach ($benchmark->models as $model) {
                    // For each question
                    foreach ($benchmark->questions as $question) {
                        $this->executeTask($run, $model, $question);
                    }
                }
            });

            $run->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);
        } catch (\Exception $e) {
            $run->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            throw $e;
        }

        return $run;
    }

    private function executeTask($run, $model, $question): void
    {
        try {
            $result = $this->llmClient->sendPrompt($model, $question);

            $execution = TaskExecution::create([
                'benchmark_run_id' => $run->id,
                'model_id' => $model->id,
                'question_id' => $question->id,
                'response_content' => $result['content'],
                'response_time_ms' => $result['response_time_ms'],
                'tokens_input' => $result['tokens_input'],
                'tokens_output' => $result['tokens_output'],
                'cost' => $this->calculateCost($model, $result),
                'status' => 'success',
                'raw_response' => $result['raw_response'],
            ]);

            // Queue evaluation
            EvaluateResponse::dispatch($execution);

        } catch (\Exception $e) {
            TaskExecution::create([
                'benchmark_run_id' => $run->id,
                'model_id' => $model->id,
                'question_id' => $question->id,
                'status' => 'error',
                'error_message' => $e->getMessage(),
            ]);
        }
    }

    private function calculateCost($model, $result): float
    {
        return ($result['tokens_input'] * $model->cost_input_per_token) +
               ($result['tokens_output'] * $model->cost_output_per_token);
    }
}
```

#### 5.4 Score Calculator
```php
// app/Services/ScoreCalculator.php
namespace App\Services;

use App\Models\TaskExecution;
use App\Models\Evaluation;

class ScoreCalculator
{
    public function evaluate(TaskExecution $execution): Evaluation
    {
        $question = $execution->question;

        $score = match($question->evaluation_method) {
            'exact_match' => $this->exactMatch($execution, $question),
            'contains' => $this->contains($execution, $question),
            'regex' => $this->regex($execution, $question),
            'llm_judge' => $this->llmJudge($execution, $question),
            default => 0,
        };

        return Evaluation::create([
            'task_execution_id' => $execution->id,
            'evaluator_type' => $question->evaluation_method,
            'score' => $score,
            'max_score' => 100,
            'normalized_score' => $score,
        ]);
    }

    private function exactMatch(TaskExecution $execution, $question): float
    {
        return strtolower(trim($execution->response_content)) ===
               strtolower(trim($question->expected_answer)) ? 100 : 0;
    }

    private function contains(TaskExecution $execution, $question): float
    {
        return stripos($execution->response_content, $question->expected_answer) !== false
            ? 100 : 0;
    }

    private function regex(TaskExecution $execution, $question): float
    {
        return preg_match($question->evaluation_criteria['pattern'], $execution->response_content)
            ? 100 : 0;
    }

    private function llmJudge(TaskExecution $execution, $question): float
    {
        // TODO: Implement LLM-as-judge in future iteration
        return 50; // Placeholder
    }
}
```

#### 5.5 Ranking Engine
```php
// app/Services/RankingEngine.php
namespace App\Services;

use App\Models\BenchmarkRun;
use App\Models\Ranking;
use Illuminate\Support\Facades\DB;

class RankingEngine
{
    public function calculate(BenchmarkRun $run): void
    {
        // Calculate overall ranking
        $modelScores = DB::table('task_executions')
            ->join('evaluations', 'task_executions.id', '=', 'evaluations.task_execution_id')
            ->where('task_executions.benchmark_run_id', $run->id)
            ->groupBy('task_executions.model_id')
            ->select(
                'task_executions.model_id',
                DB::raw('AVG(evaluations.normalized_score) as avg_score'),
                DB::raw('COUNT(*) as total_tasks')
            )
            ->orderByDesc('avg_score')
            ->get();

        foreach ($modelScores as $index => $modelScore) {
            Ranking::create([
                'benchmark_run_id' => $run->id,
                'model_id' => $modelScore->model_id,
                'ranking_type' => 'overall',
                'position' => $index + 1,
                'score' => $modelScore->avg_score,
                'sample_size' => $modelScore->total_tasks,
            ]);
        }

        // Calculate per-question-type rankings
        $this->calculateByQuestionType($run);
    }

    private function calculateByQuestionType(BenchmarkRun $run): void
    {
        $questionTypes = DB::table('questions')
            ->distinct()
            ->pluck('type');

        foreach ($questionTypes as $type) {
            $scores = DB::table('task_executions')
                ->join('evaluations', 'task_executions.id', '=', 'evaluations.task_execution_id')
                ->join('questions', 'task_executions.question_id', '=', 'questions.id')
                ->where('task_executions.benchmark_run_id', $run->id)
                ->where('questions.type', $type)
                ->groupBy('task_executions.model_id')
                ->select(
                    'task_executions.model_id',
                    DB::raw('AVG(evaluations.normalized_score) as avg_score')
                )
                ->orderByDesc('avg_score')
                ->get();

            foreach ($scores as $index => $score) {
                Ranking::create([
                    'benchmark_run_id' => $run->id,
                    'model_id' => $score->model_id,
                    'ranking_type' => 'by_question_type',
                    'dimension' => $type,
                    'position' => $index + 1,
                    'score' => $score->avg_score,
                ]);
            }
        }
    }
}
```

---

### Phase 6: Testing & Verification (Day 7)

#### 6.1 Create Tests
```php
// tests/Feature/BenchmarkTest.php
namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Benchmark;
use Laravel\Sanctum\Sanctum;

class BenchmarkTest extends TestCase
{
    public function test_can_list_benchmarks()
    {
        Sanctum::actingAs(User::factory()->create());

        $response = $this->getJson('/api/benchmarks');

        $response->assertStatus(200);
    }

    public function test_can_run_benchmark()
    {
        Sanctum::actingAs(User::factory()->create());

        $benchmark = Benchmark::factory()->create();

        $response = $this->postJson("/api/benchmarks/{$benchmark->id}/run");

        $response->assertStatus(202); // Accepted (queued)
    }

    public function test_unauthorized_access_blocked()
    {
        $response = $this->getJson('/api/benchmarks');

        $response->assertStatus(401);
    }
}
```

#### 6.2 Run Tests
```bash
php artisan test
```

---

## Security Checklist

### ✅ Pre-Launch Security Audit

- [ ] All secrets in `.env`, never hardcoded
- [ ] `.env` in `.gitignore`
- [ ] Production uses `.env.encrypted`
- [ ] `APP_DEBUG=false` in production
- [ ] `APP_ENV=production`
- [ ] HTTPS enforced (TLS 1.2+)
- [ ] API rate limiting enabled
- [ ] Sanctum tokens expire (24h max)
- [ ] CORS properly configured
- [ ] SQL injection prevented (Eloquent ORM)
- [ ] XSS prevented (Blade escaping, React sanitization)
- [ ] CSRF protection enabled
- [ ] Input validation on all endpoints
- [ ] Audit logging enabled
- [ ] Database backups configured
- [ ] Secrets rotation policy defined (quarterly)
- [ ] Non-root Docker user
- [ ] No sensitive data in logs
- [ ] Security headers configured

### Security Headers (Nginx)
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

## Deployment Checklist

### Development
```bash
docker compose up -d
php artisan migrate:fresh --seed
php artisan horizon
php artisan schedule:work
npm run dev
```

### Production
```bash
# Encrypt secrets
php artisan env:encrypt --key=your-production-key

# Build assets
npm run build

# Deploy
docker compose -f docker-compose.prod.yml up -d

# Decrypt on server
php artisan env:decrypt --key=your-production-key --env=production

# Run migrations
php artisan migrate --force

# Start services
php artisan horizon
php artisan schedule:work
```

---

## Monitoring & Observability

### Application Logging
```php
// config/logging.php
'channels' => [
    'daily' => [
        'driver' => 'daily',
        'path' => storage_path('logs/laravel.log'),
        'level' => env('LOG_LEVEL', 'debug'),
        'days' => 14,
    ],

    'security' => [
        'driver' => 'daily',
        'path' => storage_path('logs/security.log'),
        'level' => 'warning',
        'days' => 90, // Keep security logs for 90 days
    ],
],
```

### Health Check Endpoint
```php
// routes/api.php
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'database' => DB::connection()->getPdo() ? 'connected' : 'disconnected',
        'redis' => Redis::connection()->ping() ? 'connected' : 'disconnected',
        'timestamp' => now()->toIso8601String(),
    ]);
});
```

---

## Cost Estimation

### Infrastructure (Monthly)
| Service | Cost |
|---------|------|
| Server (2 vCPU, 4GB RAM) | $20 |
| PostgreSQL (managed) | $25 |
| Redis (managed) | $15 |
| Backups | $10 |
| **Total Infrastructure** | **$70/month** |

### API Costs (Weekly Benchmark)
| Item | Calculation | Monthly Cost |
|------|-------------|--------------|
| 20 models × 50 questions | 1,000 API calls/week | ~$5-20 |
| LLM-as-judge (optional) | 1,000 evaluations/week | ~$10-30 |
| **Total API** | | **$15-50/month** |

### **Total Monthly: $85-120**

---

## Timeline Summary

| Phase | Days | Deliverable |
|-------|------|-------------|
| Backend Foundation | 1-2 | Laravel app with models, migrations |
| Security Hardening | 2-3 | Sanctum, secrets, rate limiting |
| Frontend Setup | 3-4 | Inertia + React, basic dashboard |
| Docker Setup | 4-5 | Complete containerization |
| Core Services | 5-7 | Benchmark runner, scoring, ranking |
| Testing | 7 | Feature tests, verification |
| **Total** | **7 days** | **Working, secure foundation** |

---

## Success Criteria

### Functional
- ✅ Can register OpenRouter provider
- ✅ Can add LLM models
- ✅ Can create question suites
- ✅ Can run benchmark manually
- ✅ Can view results in dashboard
- ✅ Automated weekly runs work
- ✅ Rankings calculated automatically

### Security
- ✅ No secrets in code
- ✅ API requires authentication
- ✅ Rate limiting prevents abuse
- ✅ Audit log tracks changes
- ✅ HTTPS enforced
- ✅ Input validation works
- ✅ Secrets encrypted at rest

### Performance
- ✅ Dashboard loads < 2 seconds
- ✅ API responses < 500ms
- ✅ Benchmark runs without timeouts
- ✅ TimescaleDB queries fast

---

## Next Steps (Post-Foundation)

After foundation is complete (~1-2 weeks):

1. **LLM-as-Judge** - Implement advanced scoring
2. **Temporal Analysis** - WoW/MoM comparisons
3. **Advanced Charts** - Interactive visualizations
4. **Notifications** - Email/Slack on completion
5. **Mobile App** - React Native using same API
6. **Multi-Provider** - Add Anthropic, OpenAI direct

---

## References

### Security
- [Laravel Security Best Practices 2025](https://benjamincrozat.com/laravel-security-best-practices)
- [Laravel SOC2 Certification](https://laravel.com/blog/laravel-cloud-achieves-soc-2-type-2-certification-nightwatch-and-forge-next)
- [Laravel Sanctum API Auth](https://www.buanacoding.com/2025/09/laravel-api-authentication-sanctum-2025.html)
- [SOC2 Secrets Management](https://entro.security/blog/secrets-security-and-soc2-compliance/)

### Secrets Management
- [Laravel env:encrypt](https://blog.laravel.com/laravel-new-environment-encryption-commands)
- [Docker Secrets Laravel](https://github.com/corbosman/laravel-docker-secrets)
- [HashiCorp Vault Laravel](https://github.com/Polokij/laravel-vault-env)
- [Managing Production Secrets](https://flareapp.io/blog/managing-production-environment-variables-for-laravel-deployments)

### Docker & Deployment
- [Laravel Docker Best Practices](https://benjamincrozat.com/laravel-security-best-practices)
- [Docker Security](https://dev.to/devops_descent/mastering-docker-essential-best-practices-for-efficiency-and-security-34ij)
- [Laravel Deployment Guide 2025](https://ploy.cloud/blog/complete-laravel-deployment-guide-2025/)

---

**Status:** Ready for Implementation ✅
**Timeline:** 7 days to working foundation
**Security:** SOC2-ready from day 1
**Complexity:** Minimal, pragmatic, scalable
