# Modern PHP/Symfony API-First Architecture Recommendations (2025)
## LLM Benchmarking System

This document provides concrete, research-backed recommendations for building a scalable, maintainable API-first application for LLM benchmarking using modern PHP/Symfony best practices as of 2025.

---

## Executive Summary

**Recommended Stack:**
- **Framework:** Symfony 7.2+ (Current: 7.2.9, supported until Symfony 8.0 in November 2025)
- **PHP Version:** PHP 8.4 (latest stable with JIT improvements)
- **Runtime:** FrankenPHP (modern PHP app server with worker mode)
- **Database:** PostgreSQL 17+ with TimescaleDB extension
- **Cache:** Redis 7+ or Valkey (Redis fork)
- **API Framework:** API Platform 4.2+
- **Testing:** PHPUnit 12+ with Pest PHP 4.x

---

## 1. Symfony Version and Core Bundles

### Symfony 7.2+ (Latest 7.2.9)

**Key Features for Your Use Case:**
- Stateless CSRF protection (simplified API security)
- Enhanced Messenger keepalive feature (prevents timeouts during long-running benchmark jobs)
- Improved Console commands with better output formatting
- PHP 8.2+ requirement (recommend PHP 8.4)

**Support Timeline:**
- Symfony 7.2: Released November 2024, support ends July 2025
- **Recommendation:** Start with 7.2, plan migration to Symfony 8.0 (November 2025) or use Symfony 7.4 LTS when available

### Essential Bundles

#### API Development
```json
{
  "require": {
    "api-platform/core": "^4.2",
    "symfony/serializer": "7.2.*",
    "symfony/validator": "7.2.*",
    "nelmio/cors-bundle": "^2.5",
    "lexik/jwt-authentication-bundle": "^3.1"
  }
}
```

#### Database & ORM
```json
{
  "require": {
    "doctrine/doctrine-bundle": "^2.13",
    "doctrine/orm": "^3.3",
    "martin-georgiev/postgresql-for-doctrine": "^2.3",
    "stof/doctrine-extensions-bundle": "^1.12"
  }
}
```

#### Async Processing & Scheduling
```json
{
  "require": {
    "symfony/messenger": "7.2.*",
    "symfony/scheduler": "7.2.*",
    "symfony/amqp-messenger": "7.2.*"
  }
}
```

#### HTTP Client
```json
{
  "require": {
    "symfony/http-client": "7.2.*",
    "symfony/rate-limiter": "7.2.*"
  }
}
```

#### Caching & Performance
```json
{
  "require": {
    "symfony/cache": "7.2.*",
    "predis/predis": "^2.2",
    "symfony/redis-messenger": "7.2.*"
  }
}
```

---

## 2. API-First Architecture Best Practices

### Use API Platform 4.2+

**Why API Platform:**
- 10 years of maturity (celebrated at 2025 conference)
- Auto-generates OpenAPI documentation
- Built-in pagination, filtering, sorting
- Supports REST, GraphQL, and now gRPC (via FrankenPHP)
- JSON:API, JSON-LD, HAL support out of the box

**Architecture Pattern:**
```
src/
├── ApiResource/           # API Platform resources (DTOs)
├── Entity/                # Doctrine entities (domain models)
├── State/                 # State processors and providers
│   ├── Processor/
│   └── Provider/
├── Filter/                # Custom API filters
├── Serializer/            # Custom normalizers/denormalizers
└── Validator/             # Custom validation constraints
```

**Example API Resource:**
```php
<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\State\BenchmarkProcessor;
use App\State\BenchmarkProvider;

#[ApiResource(
    operations: [
        new Get(provider: BenchmarkProvider::class),
        new GetCollection(provider: BenchmarkProvider::class),
        new Post(processor: BenchmarkProcessor::class)
    ],
    paginationClientEnabled: true,
    paginationClientItemsPerPage: true
)]
class BenchmarkResult
{
    public ?int $id = null;
    public string $modelName;
    public string $provider;
    public float $score;
    public \DateTimeImmutable $timestamp;
    public array $metadata;
}
```

**Best Practices:**
- Separate API resources (DTOs) from Doctrine entities
- Use State Providers/Processors instead of controllers
- Leverage built-in filters for time-series queries
- Keep API resources in `ApiResource/` namespace, entities in `Entity/`

---

## 3. Job Scheduling: Symfony Scheduler (Recommended)

### Why Symfony Scheduler over Messenger alone?

**Symfony Scheduler Component (Available since 6.3, stable in 6.4+):**
- Purpose-built for recurring tasks at regular intervals
- One-second precision scheduling
- Distributed worker support
- Built-in overlap handling
- Dynamic schedules based on application logic
- No cron daemon required (Docker-friendly)

**When to Use Each:**
- **Scheduler:** Recurring tasks (weekly/monthly benchmarks, data cleanup)
- **Messenger:** Asynchronous task processing (individual benchmark runs, API calls)
- **Combined:** Scheduler triggers messages that Messenger processes

### Implementation

**Install:**
```bash
composer require symfony/scheduler
composer require symfony/messenger
```

**Configuration (`config/packages/scheduler.yaml`):**
```yaml
framework:
    scheduler:
        enabled: true
```

**Create Scheduled Message:**
```php
<?php

namespace App\Message;

use Symfony\Component\Scheduler\Attribute\AsSchedule;
use Symfony\Component\Scheduler\RecurringMessage;
use Symfony\Component\Scheduler\Schedule;
use Symfony\Component\Scheduler\ScheduleProviderInterface;

#[AsSchedule('benchmark_schedule')]
class BenchmarkScheduleProvider implements ScheduleProviderInterface
{
    public function getSchedule(): Schedule
    {
        return (new Schedule())
            // Weekly benchmarks every Monday at 2 AM
            ->add(
                RecurringMessage::cron('0 2 * * 1', new RunWeeklyBenchmark())
            )
            // Monthly benchmarks on the 1st at 3 AM
            ->add(
                RecurringMessage::cron('0 3 1 * *', new RunMonthlyBenchmark())
            )
            // Daily data aggregation at midnight
            ->add(
                RecurringMessage::cron('0 0 * * *', new AggregateMetrics())
            )
            // Every 5 minutes for near-real-time monitoring
            ->add(
                RecurringMessage::every('5 minutes', new CheckBenchmarkStatus())
            );
    }
}
```

**Run the Scheduler:**
```bash
# In Docker or systemd
php bin/console messenger:consume scheduler_default
```

**Messenger Configuration (`config/packages/messenger.yaml`):**
```yaml
framework:
    messenger:
        failure_transport: failed

        transports:
            async:
                dsn: '%env(MESSENGER_TRANSPORT_DSN)%'
                options:
                    queue_name: async_jobs
                retry_strategy:
                    max_retries: 3
                    delay: 1000
                    multiplier: 2

            scheduler_default:
                dsn: 'doctrine://default'

            failed:
                dsn: 'doctrine://default?queue_name=failed'

        routing:
            'App\Message\RunWeeklyBenchmark': async
            'App\Message\RunMonthlyBenchmark': async
            'App\Message\AggregateMetrics': async
```

**Alternative: Zenstruck/Schedule-Bundle**
- If you need more advanced cron features, consider `zenstruck/schedule-bundle`
- Provides Laravel-like scheduling syntax
- More mature ecosystem for complex scheduling

---

## 4. HTTP Client for LLM API Calls

### Symfony HttpClient (Recommended over Guzzle)

**Why Symfony HttpClient:**
- Native Symfony integration
- Built-in retry mechanism (since Symfony 5.2)
- Better performance than Guzzle in benchmarks
- PSR-18 compatible
- Built-in async request support
- Native rate limiting support (Symfony 7.2)

**Configuration:**
```yaml
# config/packages/framework.yaml
framework:
    http_client:
        default_options:
            timeout: 30
            max_duration: 60

        scoped_clients:
            openai.client:
                base_uri: 'https://api.openai.com/v1/'
                headers:
                    'Authorization': 'Bearer %env(OPENAI_API_KEY)%'
                retry_failed:
                    http_codes:
                        429: # Too Many Requests
                            delay: 5000
                            multiplier: 2
                            max_delay: 30000
                        503: # Service Unavailable
                            delay: 1000
                            multiplier: 2
                    max_retries: 5

            anthropic.client:
                base_uri: 'https://api.anthropic.com/v1/'
                headers:
                    'x-api-key': '%env(ANTHROPIC_API_KEY)%'
                    'anthropic-version': '2023-06-01'
                retry_failed:
                    http_codes: [429, 500, 502, 503, 504]
                    max_retries: 5
                    delay: 2000
                    multiplier: 2

            google.client:
                base_uri: 'https://generativelanguage.googleapis.com/v1/'
                query:
                    key: '%env(GOOGLE_API_KEY)%'
                retry_failed:
                    max_retries: 5
```

**Rate Limiting Integration:**
```php
<?php

namespace App\Service;

use Symfony\Component\HttpClient\HttpClient;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class LlmApiService
{
    public function __construct(
        private HttpClientInterface $openaiClient,
        private RateLimiterFactory $llmApiLimiter
    ) {}

    public function callOpenAI(string $prompt): array
    {
        // Rate limiting before making request
        $limiter = $this->llmApiLimiter->create('openai');
        $limiter->consume(1)->wait();

        $response = $this->openaiClient->request('POST', 'chat/completions', [
            'json' => [
                'model' => 'gpt-4',
                'messages' => [['role' => 'user', 'content' => $prompt]],
            ],
        ]);

        return $response->toArray();
    }
}
```

**Rate Limiter Configuration (`config/packages/rate_limiter.yaml`):**
```yaml
framework:
    rate_limiter:
        llm_api:
            policy: 'sliding_window'
            limit: 60
            interval: '1 minute'
```

### Alternative: Guzzle with Retry Middleware

If you need Guzzle for specific integrations:
```bash
composer require guzzlehttp/guzzle
composer require caseyamcl/guzzle_retry_middleware
```

---

## 5. Database: PostgreSQL 17 + TimescaleDB

### PostgreSQL 17 + TimescaleDB Extension

**Why This Combination:**
- TimescaleDB is purpose-built for time-series data
- Hypertables auto-partition data by time
- Native compression for historical data (reduces storage by 90%+)
- Full PostgreSQL compatibility (use all features: JSONB, indexes, joins)
- Excellent for benchmark results over time

**Docker Setup:**
```yaml
# docker-compose.yml
services:
  postgres:
    image: timescale/timescaledb:latest-pg17
    environment:
      POSTGRES_DB: benchmark
      POSTGRES_USER: benchmark
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    command:
      - "postgres"
      - "-c"
      - "shared_preload_libraries=timescaledb"
      - "-c"
      - "max_connections=200"
      - "-c"
      - "shared_buffers=2GB"
      - "-c"
      - "effective_cache_size=6GB"
      - "-c"
      - "work_mem=16MB"
```

**Enable TimescaleDB:**
```sql
-- migrations/Version20250101000000.php
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

### Schema Design for Time-Series Data

**Benchmark Results Table (Hypertable):**
```php
<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'benchmark_results')]
#[ORM\Index(columns: ['timestamp'], name: 'idx_timestamp')]
#[ORM\Index(columns: ['model_name', 'provider'], name: 'idx_model_provider')]
class BenchmarkResult
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'bigint')]
    private ?int $id = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $timestamp;

    #[ORM\Column(type: 'string', length: 100)]
    private string $modelName;

    #[ORM\Column(type: 'string', length: 50)]
    private string $provider;

    #[ORM\Column(type: 'string', length: 50)]
    private string $benchmarkType; // 'weekly', 'monthly', 'adhoc'

    #[ORM\Column(type: 'decimal', precision: 10, scale: 4)]
    private string $score;

    #[ORM\Column(type: 'integer')]
    private int $responseTimeMs;

    #[ORM\Column(type: 'integer')]
    private int $tokenCount;

    // Store detailed metrics as JSONB
    #[ORM\Column(type: 'json', options: ['jsonb' => true])]
    private array $metrics;

    // Store full request/response for audit
    #[ORM\Column(type: 'json', options: ['jsonb' => true])]
    private array $details;
}
```

**Convert to TimescaleDB Hypertable (Migration):**
```sql
-- After creating the table, convert to hypertable
SELECT create_hypertable('benchmark_results', 'timestamp',
    chunk_time_interval => INTERVAL '1 week'
);

-- Create continuous aggregate for weekly averages
CREATE MATERIALIZED VIEW benchmark_weekly_avg
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('7 days', timestamp) AS week,
    model_name,
    provider,
    AVG(score) as avg_score,
    AVG(response_time_ms) as avg_response_time,
    COUNT(*) as total_runs
FROM benchmark_results
GROUP BY week, model_name, provider;

-- Refresh policy (auto-update)
SELECT add_continuous_aggregate_policy('benchmark_weekly_avg',
    start_offset => INTERVAL '1 month',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day'
);

-- Compression policy for data older than 30 days
SELECT add_compression_policy('benchmark_results', INTERVAL '30 days');

-- Retention policy (optional - delete data older than 2 years)
SELECT add_retention_policy('benchmark_results', INTERVAL '2 years');
```

### Indexing Strategies for Time-Series

**BRIN Indexes for Time Columns:**
```sql
-- BRIN index for timestamp (saves 99% space vs B-tree for time-series)
CREATE INDEX idx_timestamp_brin ON benchmark_results
USING BRIN (timestamp) WITH (pages_per_range = 128);

-- GiST index for JSONB queries
CREATE INDEX idx_metrics_gin ON benchmark_results
USING GIN (metrics jsonb_path_ops);

-- B-tree for frequently filtered columns
CREATE INDEX idx_model_provider ON benchmark_results (model_name, provider);

-- Composite index for rankings
CREATE INDEX idx_ranking ON benchmark_results (timestamp DESC, score DESC);
```

**Why BRIN for Time-Series:**
- 99% smaller than B-tree indexes
- Perfect for naturally ordered data (timestamps)
- Extremely fast inserts (important for high-velocity data)
- Trade-off: Slightly slower queries (but still very fast for time ranges)

### PostgreSQL JSONB for Flexible Metadata

**Doctrine Configuration:**
```bash
composer require martin-georgiev/postgresql-for-doctrine
```

**Configuration (`config/packages/doctrine.yaml`):**
```yaml
doctrine:
    dbal:
        driver: 'pdo_pgsql'
        server_version: '17'
        charset: utf8
        types:
            jsonb: MartinGeorgiev\Doctrine\DBAL\Types\Jsonb
```

**Querying JSONB:**
```php
// In Repository
$qb = $this->createQueryBuilder('b')
    ->where("JSONB_EXISTS(b.metrics, 'accuracy') = true")
    ->andWhere("JSONB_GET_TEXT(b.metrics, 'accuracy') > :threshold")
    ->setParameter('threshold', '0.8');
```

---

## 6. Architectural Patterns

### Recommended: Layered Architecture with DDD Principles

**For your LLM benchmarking system, a pragmatic approach:**

1. **Not Full DDD/CQRS/Event Sourcing** - Overkill for most applications
2. **Tactical DDD** - Use value objects, aggregates, repositories
3. **Simple CQRS** - Separate read and write models where beneficial
4. **Event-Driven** - Use Symfony Messenger for async processing

**Directory Structure:**
```
src/
├── ApiResource/              # API Platform resources (read models)
├── Command/                  # Console commands
├── Entity/                   # Doctrine entities (write models)
│   ├── Benchmark/
│   ├── Model/
│   └── Provider/
├── Repository/               # Doctrine repositories
├── Service/                  # Application services
│   ├── Benchmark/
│   ├── LlmClient/
│   └── Analysis/
├── Message/                  # Messenger messages (commands/events)
│   ├── Command/
│   └── Event/
├── MessageHandler/           # Messenger handlers
├── State/                    # API Platform state processors/providers
│   ├── Processor/
│   └── Provider/
├── ValueObject/              # DDD value objects
└── Exception/                # Custom exceptions
```

### When to Consider Full CQRS/Event Sourcing

**Consider if you need:**
- Complete audit trail of every benchmark run
- Ability to replay/recompute historical scores
- Multiple read models from same data (different aggregations)
- Complex business rules around benchmark validity

**Frameworks for CQRS/ES in PHP:**
- **Ecotone Framework** - Modern, Symfony-friendly, active development
- **Prooph** - Mature, enterprise-ready, microservices support

**Example with Ecotone (if you go this route):**
```bash
composer require ecotone/symfony-bundle
```

```php
<?php

namespace App\Domain;

use Ecotone\Modelling\Attribute\Aggregate;
use Ecotone\Modelling\Attribute\CommandHandler;
use Ecotone\Modelling\Attribute\EventHandler;

#[Aggregate]
class BenchmarkRun
{
    private string $id;
    private string $status;

    #[CommandHandler]
    public static function schedule(ScheduleBenchmark $command): self
    {
        $self = new self();
        $self->id = $command->id;
        $self->status = 'scheduled';
        return $self;
    }

    #[EventHandler]
    public function onBenchmarkCompleted(BenchmarkCompleted $event): void
    {
        $this->status = 'completed';
    }
}
```

### Recommended Pattern for Your Use Case: Layered + Event-Driven

**Benefits:**
- Simpler than full DDD/CQRS
- Leverages Symfony's strengths
- Scales well for time-series analytics
- Easy to test and maintain

**Example Flow:**
1. API Platform receives POST request to `/benchmark-runs`
2. State Processor validates and creates entity
3. Processor dispatches `RunBenchmarkMessage` to Messenger
4. MessageHandler executes benchmark asynchronously
5. Handler dispatches `BenchmarkCompletedEvent`
6. Multiple handlers process event (store results, update rankings, notify)

---

## 7. Docker Setup Best Practices (2025)

### FrankenPHP: The Modern PHP Runtime

**Why FrankenPHP over Traditional PHP-FPM:**
- **Worker Mode:** Keeps Symfony container loaded between requests (4x faster)
- **Built-in Caddy:** Auto HTTPS, HTTP/2, HTTP/3
- **Lower Memory:** Up to 50% reduction vs PHP-FPM
- **Mercure Built-in:** Real-time updates for dashboard
- **gRPC Support:** Future-proof for inter-service communication

**Official Symfony Docker Template:**
```bash
# Clone the official template
git clone https://github.com/dunglas/symfony-docker benchmark
cd benchmark
docker compose up -d
```

### Custom Docker Compose Configuration

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  php:
    build:
      context: .
      dockerfile: Dockerfile
      target: frankenphp_prod
    environment:
      SERVER_NAME: :80
      FRANKENPHP_CONFIG: "worker ./public/index.php"
      DATABASE_URL: postgresql://benchmark:${DB_PASSWORD}@postgres:5432/benchmark
      REDIS_URL: redis://redis:6379
      MESSENGER_TRANSPORT_DSN: doctrine://default
    volumes:
      - ./:/app
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    depends_on:
      - postgres
      - redis

  postgres:
    image: timescale/timescaledb:latest-pg17
    environment:
      POSTGRES_DB: benchmark
      POSTGRES_USER: benchmark
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: valkey/valkey:8
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  messenger:
    build:
      context: .
      dockerfile: Dockerfile
      target: frankenphp_prod
    command: php bin/console messenger:consume async scheduler_default -vv
    environment:
      DATABASE_URL: postgresql://benchmark:${DB_PASSWORD}@postgres:5432/benchmark
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

**Dockerfile (Multi-stage with FrankenPHP):**
```dockerfile
# syntax=docker/dockerfile:1

# Base FrankenPHP image
FROM dunglas/frankenphp:latest-php8.4 AS frankenphp_base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libpq-dev \
    libzip-dev \
    && docker-php-ext-install \
        pdo_pgsql \
        pgsql \
        zip \
        opcache \
    && pecl install redis \
    && docker-php-ext-enable redis

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Development stage
FROM frankenphp_base AS frankenphp_dev

ENV APP_ENV=dev
ENV XDEBUG_MODE=off

RUN install-php-extensions xdebug

WORKDIR /app

# Production stage
FROM frankenphp_base AS frankenphp_prod

ENV APP_ENV=prod
ENV FRANKENPHP_CONFIG="worker ./public/index.php"

# PHP configuration
COPY docker/php/php.ini $PHP_INI_DIR/php.ini
COPY docker/php/php-prod.ini $PHP_INI_DIR/conf.d/php-prod.ini

# Caddy configuration
COPY docker/caddy/Caddyfile /etc/caddy/Caddyfile

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts

COPY . .

RUN composer dump-autoload --optimize --no-dev && \
    php bin/console cache:clear && \
    php bin/console cache:warmup

# Set permissions
RUN chown -R www-data:www-data /app/var
```

**Caddyfile for FrankenPHP:**
```caddyfile
{
    frankenphp {
        worker {
            file public/index.php
            num 4
        }
    }
}

:80 {
    root * public
    encode gzip zstd
    php_server
}
```

**PHP Configuration (docker/php/php-prod.ini):**
```ini
[PHP]
memory_limit = 256M
max_execution_time = 60
upload_max_filesize = 10M

[opcache]
opcache.enable=1
opcache.memory_consumption=256
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0
opcache.preload=/app/config/preload.php
opcache.preload_user=www-data
opcache.jit=tracing
opcache.jit_buffer_size=100M

[realpath cache]
realpath_cache_size=4096K
realpath_cache_ttl=600
```

### Alternative: Traditional PHP-FPM (If FrankenPHP Doesn't Fit)

```yaml
services:
  php:
    image: php:8.4-fpm-alpine
    volumes:
      - ./:/var/www/html

  nginx:
    image: nginx:alpine
    volumes:
      - ./:/var/www/html
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
    depends_on:
      - php
```

---

## 8. Testing Framework Recommendations

### PHPUnit 12 + Pest PHP 4

**Why Pest over Plain PHPUnit:**
- More readable and concise syntax
- Built on PHPUnit (100% compatible)
- Great for API testing
- Active development (v4.1.4 released November 2025)
- No need to rewrite existing PHPUnit tests

**Installation:**
```bash
composer require --dev pestphp/pest
composer require --dev pestphp/pest-plugin-symfony
composer require --dev zenstruck/foundry
composer require --dev zenstruck/browser
```

**Initialize Pest:**
```bash
./vendor/bin/pest --init
```

### Test Structure

**tests/ Directory:**
```
tests/
├── Unit/
│   ├── Service/
│   └── ValueObject/
├── Integration/
│   ├── Repository/
│   └── Message/
├── Functional/  (API tests)
│   ├── BenchmarkApiTest.php
│   └── RankingApiTest.php
└── Fixtures/
    └── Factory/
```

**Example Pest Test for API:**
```php
<?php

// tests/Functional/BenchmarkApiTest.php

use function Pest\Symfony\{get, post};

it('creates a new benchmark run', function () {
    post('/api/benchmark-runs', [
        'json' => [
            'modelName' => 'gpt-4',
            'provider' => 'openai',
            'benchmarkType' => 'weekly',
        ],
    ])
        ->assertStatus(201)
        ->assertJsonPath('modelName', 'gpt-4')
        ->assertJsonPath('status', 'scheduled');
});

it('retrieves benchmark rankings', function () {
    get('/api/benchmarks/rankings?period=weekly')
        ->assertStatus(200)
        ->assertJsonStructure([
            'rankings' => [
                '*' => ['modelName', 'provider', 'avgScore', 'rank'],
            ],
        ]);
});

it('filters benchmarks by date range', function () {
    get('/api/benchmarks?timestamp[after]=2025-01-01&timestamp[before]=2025-12-31')
        ->assertStatus(200)
        ->assertJsonCount(10, 'hydra:member');
});
```

**Example with Foundry for Fixtures:**
```php
<?php

// tests/Factory/BenchmarkResultFactory.php

namespace App\Tests\Factory;

use App\Entity\BenchmarkResult;
use Zenstruck\Foundry\ModelFactory;

final class BenchmarkResultFactory extends ModelFactory
{
    protected function getDefaults(): array
    {
        return [
            'timestamp' => \DateTimeImmutable::createFromMutable(self::faker()->dateTime()),
            'modelName' => self::faker()->randomElement(['gpt-4', 'claude-3', 'gemini-pro']),
            'provider' => self::faker()->randomElement(['openai', 'anthropic', 'google']),
            'benchmarkType' => 'weekly',
            'score' => self::faker()->randomFloat(4, 0, 1),
            'responseTimeMs' => self::faker()->numberBetween(100, 5000),
            'tokenCount' => self::faker()->numberBetween(100, 2000),
            'metrics' => [
                'accuracy' => self::faker()->randomFloat(4, 0.5, 1),
                'coherence' => self::faker()->randomFloat(4, 0.5, 1),
            ],
            'details' => ['test' => true],
        ];
    }

    protected static function getClass(): string
    {
        return BenchmarkResult::class;
    }
}
```

**Using Foundry in Tests:**
```php
<?php

use App\Tests\Factory\BenchmarkResultFactory;

it('calculates correct weekly averages', function () {
    // Create 10 benchmark results
    BenchmarkResultFactory::createMany(10, [
        'modelName' => 'gpt-4',
        'timestamp' => new \DateTimeImmutable('2025-01-01'),
    ]);

    $response = get('/api/benchmarks/weekly-average?model=gpt-4&week=2025-W01');

    $response->assertStatus(200);
});
```

### API Platform Testing

**Built-in Test Client:**
```php
<?php

use ApiPlatform\Symfony\Bundle\Test\ApiTestCase;

final class BenchmarkApiTest extends ApiTestCase
{
    public function testGetCollection(): void
    {
        $response = static::createClient()->request('GET', '/api/benchmark_results');

        $this->assertResponseIsSuccessful();
        $this->assertResponseHeaderSame('content-type', 'application/ld+json; charset=utf-8');
        $this->assertJsonContains(['@context' => '/api/contexts/BenchmarkResult']);
        $this->assertMatchesResourceCollectionJsonSchema(BenchmarkResult::class);
    }
}
```

---

## 9. Additional Recommendations

### Logging & Monitoring

**Structured JSON Logging for ELK Stack:**

```yaml
# config/packages/monolog.yaml
monolog:
    handlers:
        main:
            type: stream
            path: php://stdout
            level: info
            formatter: monolog.formatter.json

        elasticsearch:
            type: elastica
            index: symfony_logs
            document_type: logs
            level: warning
            elasticsearch:
                host: '%env(ELASTICSEARCH_HOST)%'
                port: 9200
```

**Or use ElasticsearchLogstashHandler:**
```yaml
monolog:
    handlers:
        elasticsearch:
            type: elasticsearch
            index: benchmark_logs
            elasticsearch_version: 8
            hub: 'http://elasticsearch:9200'
            level: info
```

### Caching Strategy

**Redis/Valkey for Cache:**
```yaml
# config/packages/cache.yaml
framework:
    cache:
        app: cache.adapter.redis
        system: cache.adapter.system

        pools:
            cache.benchmark_rankings:
                adapter: cache.adapter.redis
                default_lifetime: 3600

            cache.model_stats:
                adapter: cache.adapter.redis
                default_lifetime: 1800

services:
    cache.adapter.redis:
        class: Symfony\Component\Cache\Adapter\RedisAdapter
        arguments:
            - '@redis.client'

    redis.client:
        class: Redis
        calls:
            - connect:
                - '%env(REDIS_HOST)%'
                - 6379
```

**Why Valkey:**
- Drop-in Redis replacement
- Open-source (Redis changed to restrictive license)
- AWS and Google backing
- Same performance as Redis

### Authentication & Authorization

**JWT Authentication:**
```bash
composer require lexik/jwt-authentication-bundle
```

```yaml
# config/packages/security.yaml
security:
    firewalls:
        api:
            pattern: ^/api
            stateless: true
            jwt: ~

    access_control:
        - { path: ^/api/docs, roles: PUBLIC_ACCESS }
        - { path: ^/api, roles: IS_AUTHENTICATED_FULLY }
```

---

## 10. Complete Package Recommendations

### composer.json (Complete)

```json
{
    "name": "yourorg/benchmark",
    "type": "project",
    "license": "proprietary",
    "require": {
        "php": ">=8.4",
        "ext-redis": "*",
        "ext-pgsql": "*",

        "symfony/framework-bundle": "7.2.*",
        "symfony/runtime": "7.2.*",
        "symfony/flex": "^2",
        "symfony/dotenv": "7.2.*",

        "api-platform/core": "^4.2",
        "doctrine/doctrine-bundle": "^2.13",
        "doctrine/orm": "^3.3",
        "doctrine/doctrine-migrations-bundle": "^3.3",
        "martin-georgiev/postgresql-for-doctrine": "^2.3",

        "symfony/messenger": "7.2.*",
        "symfony/scheduler": "7.2.*",
        "symfony/amqp-messenger": "7.2.*",

        "symfony/http-client": "7.2.*",
        "symfony/rate-limiter": "7.2.*",

        "symfony/cache": "7.2.*",
        "predis/predis": "^2.2",

        "symfony/serializer": "7.2.*",
        "symfony/validator": "7.2.*",
        "symfony/monolog-bundle": "^3.10",

        "nelmio/cors-bundle": "^2.5",
        "lexik/jwt-authentication-bundle": "^3.1",

        "runtime/frankenphp-symfony": "^0.2"
    },
    "require-dev": {
        "pestphp/pest": "^4.1",
        "pestphp/pest-plugin-symfony": "^4.0",
        "phpunit/phpunit": "^12.0",
        "zenstruck/foundry": "^2.0",
        "zenstruck/browser": "^2.0",
        "symfony/maker-bundle": "^1.52",
        "symfony/web-profiler-bundle": "7.2.*",
        "doctrine/doctrine-fixtures-bundle": "^3.6"
    },
    "config": {
        "allow-plugins": {
            "php-http/discovery": true,
            "symfony/flex": true,
            "symfony/runtime": true,
            "pestphp/pest-plugin": true
        },
        "sort-packages": true
    },
    "autoload": {
        "psr-4": {
            "App\\": "src/"
        }
    },
    "autoload-dev": {
        "psr-4": {
            "App\\Tests\\": "tests/"
        }
    },
    "scripts": {
        "auto-scripts": {
            "cache:clear": "symfony-cmd",
            "assets:install %PUBLIC_DIR%": "symfony-cmd"
        },
        "post-install-cmd": [
            "@auto-scripts"
        ],
        "post-update-cmd": [
            "@auto-scripts"
        ]
    },
    "conflict": {
        "symfony/symfony": "*"
    },
    "extra": {
        "symfony": {
            "allow-contrib": false,
            "require": "7.2.*"
        }
    }
}
```

---

## 11. Performance Optimization Checklist

### PHP 8.4 JIT Configuration
- Enable JIT with tracing mode: `opcache.jit=tracing`
- Set buffer size: `opcache.jit_buffer_size=100M`
- **Expected gain:** 7-70% for computation-heavy tasks, minimal for typical web requests

### OPcache Preloading
```php
// config/preload.php
<?php

if (file_exists(__DIR__ . '/../var/cache/prod/App_KernelProdContainer.preload.php')) {
    require_once __DIR__ . '/../var/cache/prod/App_KernelProdContainer.preload.php';
}
```

### Database Optimization
1. Use BRIN indexes for timestamp columns
2. Enable TimescaleDB compression after 30 days
3. Create continuous aggregates for common queries
4. Use JSONB with GIN indexes for flexible metadata
5. Connection pooling (PgBouncer for >100 concurrent connections)

### Caching Strategy
1. Redis for application cache
2. HTTP cache with Symfony HttpCache or Varnish
3. API Platform's built-in cache
4. Database query result cache (Redis)

---

## 12. Migration Path & Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Set up Symfony 7.2 with API Platform
- Configure Docker with FrankenPHP
- Set up PostgreSQL with TimescaleDB
- Implement basic CRUD for benchmarks

### Phase 2: Async Processing (Weeks 3-4)
- Configure Symfony Messenger
- Implement Symfony Scheduler
- Create LLM client services with retry logic
- Build message handlers for benchmark execution

### Phase 3: Time-Series & Analytics (Weeks 5-6)
- Design TimescaleDB hypertables
- Create continuous aggregates
- Implement ranking algorithms
- Build comparison APIs

### Phase 4: Dashboard & Visualization (Weeks 7-8)
- Frontend framework (Vue.js/React with Inertia.js)
- Real-time updates with Mercure
- Charts and visualizations
- Admin panel

### Phase 5: Production Hardening (Week 9+)
- Comprehensive testing (Pest)
- Monitoring & logging (ELK stack)
- Performance optimization
- Security audit
- CI/CD pipeline

---

## Resources & References

### Official Documentation
- [Symfony 7.2 Documentation](https://symfony.com/doc/7.2/index.html)
- [API Platform Documentation](https://api-platform.com/docs/)
- [Symfony Scheduler Documentation](https://symfony.com/doc/current/scheduler.html)
- [Symfony HttpClient Documentation](https://symfony.com/doc/current/http_client.html)
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [FrankenPHP Documentation](https://frankenphp.dev/)
- [Pest PHP Documentation](https://pestphp.com/)

### Community Resources
- [SymfonyCasts](https://symfonycasts.com/) - Premium tutorials
- [API Platform Conference 2025](https://blog.darkwood.com/article/api-platform-conference-2025)
- [JoliCode Blog - Symfony Scheduler](https://jolicode.com/blog/master-task-scheduling-with-symfony-scheduler)
- [dunglas/symfony-docker](https://github.com/dunglas/symfony-docker) - Official Docker template

### Performance Benchmarks
- [PHP 8.4 JIT Benchmarks with Symfony 7.4](https://medium.com/@laurentmn/php-8-4-jit-under-the-microscope-benchmarking-real-symfony-7-4-applications-part-1-c685e1326f5e)
- [Tideways PHP Benchmarks](https://tideways.com/profiler/blog/php-benchmarks-8-4-performance-is-steady-compared-to-8-3-and-8-2)
- [PostgreSQL BRIN Index Performance](https://www.crunchydata.com/blog/postgres-indexing-when-does-brin-win)

---

## Summary: Quick Reference

| **Component** | **Recommendation** | **Version** |
|--------------|-------------------|-------------|
| PHP | PHP 8.4 | 8.4.x |
| Framework | Symfony | 7.2.9 |
| API Framework | API Platform | 4.2+ |
| Runtime | FrankenPHP | latest |
| Database | PostgreSQL + TimescaleDB | 17 + latest |
| Cache | Redis or Valkey | 7+/8+ |
| Job Scheduling | Symfony Scheduler | 7.2 |
| Async Processing | Symfony Messenger | 7.2 |
| HTTP Client | Symfony HttpClient | 7.2 |
| Testing | PHPUnit + Pest | 12 + 4.x |
| Fixtures | Foundry | 2.0 |
| Authentication | JWT (LexikJWT) | 3.1 |
| Logging | Monolog | 3.10 |

**Architecture:** Layered + Event-Driven (not full DDD/CQRS)

**Docker Setup:** FrankenPHP worker mode for 4x performance

**Database Strategy:** TimescaleDB hypertables with BRIN indexes for time-series

**Scalability:** Async jobs via Messenger, Redis cache, continuous aggregates

---

*Document Version: 1.0*
*Last Updated: November 2025*
*Research Date: November 24, 2025*
