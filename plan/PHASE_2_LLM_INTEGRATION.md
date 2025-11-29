# PHASE 2: LLM Integration

**Status:** ✅ COMPLETED
**Goal:** Connect to OpenRouter and call LLM APIs with proper error handling
**Completed:** 2025-11-28
**Prerequisites:** Phase 1 completed

---

## Phase Objectives

By the end of this phase:
1. ✅ Provider service abstraction layer
2. ✅ LLM client with exponential backoff retry
3. ✅ Rate limiting per provider
4. ✅ OpenRouter integration tested
5. ✅ API endpoint to test model connectivity

---

## Progress Tracker

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 2.1 | Create LLM types in shared package | ✅ COMPLETED | `app/shared/src/types/llm.ts` |
| 2.2 | Create LLM Zod schemas | ✅ COMPLETED | `app/shared/src/schemas/llm.ts` |
| 2.3 | Create LLM error classes | ✅ COMPLETED | `app/server/src/services/llm/errors.ts` |
| 2.4 | Create rate limiter service | ✅ COMPLETED | Token bucket algorithm |
| 2.5 | Implement OpenRouter provider | ✅ COMPLETED | With timeout handling |
| 2.6 | Create LLM client with retry logic | ✅ COMPLETED | Exponential backoff with jitter |
| 2.7 | Create provider manager | ✅ COMPLETED | Singleton pattern, auto-init |
| 2.8 | Add LLM API routes | ✅ COMPLETED | 5 endpoints |
| 2.9 | Test all endpoints | ✅ COMPLETED | All verified working |

---

## What Was Implemented

### Shared Package (`app/shared/src/`)

**New Types (`types/llm.ts`):**
- `LLMMessage` - Chat message with role and content
- `LLMRequest` - Request payload for LLM APIs
- `LLMResponse` - Normalized response format
- `LLMFinishReason` - Normalized finish reasons
- `LLMProviderConfig` - Provider configuration
- `LLMTestResult` - Connection test result
- `LLMModelInfo` - Model information from provider
- `LLMRetryConfig` - Retry configuration
- `DEFAULT_RETRY_CONFIG` - Default retry settings

**New Schemas (`schemas/llm.ts`):**
- `llmMessageSchema` - Message validation
- `llmRequestSchema` - Request validation
- `testPromptSchema` - Test endpoint validation
- `llmResponseSchema` - Response validation

### Server Package (`app/server/src/services/llm/`)

**Error Classes (`errors.ts`):**
- `LLMError` - Base error class with `isRetryable` flag
- `LLMAuthError` - Authentication failures (401/403)
- `LLMRateLimitError` - Rate limit exceeded (429)
- `LLMTimeoutError` - Request timeout
- `LLMProviderError` - Provider errors (5xx)
- `LLMProviderNotFoundError` - Provider not found
- `LLMModelNotFoundError` - Model not found
- `parseProviderError()` - Smart error parsing

**Rate Limiter (`rate-limiter.ts`):**
- Token bucket algorithm implementation
- Per-provider rate limiting
- Automatic token refill over time
- `getRateLimiter()` - Singleton factory
- `clearRateLimiters()` - Testing utility

**Base Provider (`base-provider.ts`):**
- `ILLMProvider` interface definition
- `BaseLLMProvider` abstract class
- Common header management

**OpenRouter Provider (`openrouter-provider.ts`):**
- Full OpenRouter API implementation
- Chat completions endpoint
- Model listing endpoint
- Connection testing
- 2-minute request timeout
- Finish reason normalization

**LLM Client (`llm-client.ts`):**
- Exponential backoff retry logic
- Jitter to prevent thundering herd
- Auth error detection (no retry)
- Rate limiter integration
- Configurable retry settings

**Provider Manager (`provider-manager.ts`):**
- Singleton pattern with `getProviderManager()`
- Auto-initialization from database
- Provider registration with API key detection
- Client caching
- `reloadProvider()` for config updates

### API Routes (`app/server/src/api/llm.ts`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/llm/test` | POST | Test LLM with a prompt |
| `/api/llm/providers/:id/test` | GET | Test provider connectivity |
| `/api/llm/providers/:id/models` | GET | List provider's available models |
| `/api/llm/status` | GET | Get status of all providers |
| `/api/llm/providers/:id/reload` | POST | Reload a provider config |

---

## File Structure Created

```
app/
├── shared/src/
│   ├── types/
│   │   └── llm.ts              # LLM type definitions
│   ├── schemas/
│   │   ├── llm.ts              # Zod validation schemas
│   │   └── index.ts            # Updated exports
│   └── index.ts                # Updated exports
│
└── server/src/
    ├── services/
    │   └── llm/
    │       ├── index.ts        # Module exports
    │       ├── errors.ts       # Error classes
    │       ├── rate-limiter.ts # Token bucket rate limiter
    │       ├── base-provider.ts# Provider interface
    │       ├── openrouter-provider.ts # OpenRouter implementation
    │       ├── llm-client.ts   # Client with retry logic
    │       └── provider-manager.ts # Provider management
    ├── api/
    │   └── llm.ts              # LLM API routes
    └── index.ts                # Updated with LLM routes
```

---

## Usage Examples

### Test Provider Connectivity
```bash
curl http://localhost:3000/api/llm/providers/{providerId}/test
# Returns: {"data":{"providerId":"...","connected":true/false,...}}
```

### Check All Provider Status
```bash
curl http://localhost:3000/api/llm/status
# Returns: {"data":{"providers":[...],"totalActive":1,"totalRegistered":0}}
```

### List Available Models
```bash
curl http://localhost:3000/api/llm/providers/{providerId}/models
# Returns: {"data":{"providerId":"...","models":[...],"count":...}}
```

### Test LLM Call
```bash
# With specific model (recommended: use free models for testing)
curl -X POST http://localhost:3000/api/llm/test \
  -H "Content-Type: application/json" \
  -d '{"providerId":"...","model":"x-ai/grok-4.1-fast:free","prompt":"Hello!"}'

# Without model (defaults to meta-llama/llama-3.2-3b-instruct:free)
curl -X POST http://localhost:3000/api/llm/test \
  -H "Content-Type: application/json" \
  -d '{"providerId":"...","prompt":"Hello!"}'

# Returns: {"data":{"content":"...","tokensInput":...,"tokensOutput":...,...}}
```

### Free Models Available
OpenRouter offers free models (suffix `:free`) that don't require credits:
- `x-ai/grok-4.1-fast:free` - Fast Grok model
- `meta-llama/llama-3.2-3b-instruct:free` - Default fallback
- `google/gemma-3-1b-it:free` - Small Gemma model
- Many more - check `/api/llm/providers/:id/models` and filter for `:free`

---

## Configuration

### Environment Variables

Create `.env` file in **project root** (not app/server/):
```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
LOG_LEVEL=info
```

See `app/server/.env.sample` for all available options.

### Creating a Provider

```bash
curl -X POST http://localhost:3000/api/providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenRouter",
    "apiEndpoint": "https://openrouter.ai/api/v1",
    "apiKeyEnvVar": "OPENROUTER_API_KEY",
    "rateLimitPerMinute": 60
  }'
```

---

## Technical Decisions

1. **Token Bucket Rate Limiting** - More flexible than fixed window, allows burst requests while maintaining average rate

2. **Normalized Error Classes** - Each error type has `isRetryable` flag for smart retry logic

3. **2-Minute Timeout** - LLM calls can be slow; 2 minutes balances responsiveness with completion

4. **Exponential Backoff with Jitter** - Prevents thundering herd when multiple requests fail simultaneously

5. **Provider Manager Singleton** - Ensures consistent caching and rate limiting across all requests

6. **Finish Reason Normalization** - Maps provider-specific reasons to standard set for consistent handling

---

## OpenRouter API Reference

**Base URL:** `https://openrouter.ai/api/v1`

**Required Headers:**
- `Authorization: Bearer <API_KEY>`
- `Content-Type: application/json`

**Recommended Headers:**
- `HTTP-Referer: https://sabe.local`
- `X-Title: SABE Benchmark`

**Rate Limits:**
- Free tier: 20 req/min, 50 req/day
- Paid ($10+ credits): 1000 req/day

---

## Verification Checklist

- [x] OpenRouter provider class created
- [x] LLM client with retry logic works
- [x] Rate limiter tracks requests
- [x] Provider manager initializes from DB
- [x] `/api/llm/providers/:id/test` returns connection status
- [x] `/api/llm/providers/:id/models` endpoint works
- [x] `/api/llm/test` endpoint validates input
- [x] Error handling returns proper status codes
- [x] Logs show provider initialization
- [x] Build succeeds without errors

---

## Next Phase

Phase 2 is complete. Proceed to:
**→ PHASE_3_BENCHMARK_ENGINE.md**

The next phase will use the LLM services to:
- Execute benchmark runs
- Store task executions
- Implement rule-based evaluation

---

## Troubleshooting

### "API key not found"
- Create `.env` file in `app/server/`
- Set `OPENROUTER_API_KEY=your-key`
- Restart server to reload environment

### "Provider not active or API key not configured"
- Provider exists but API key environment variable not set
- Check the `apiKeyEnvVar` field on the provider record

### "Provider not found or not configured"
- Provider not in database OR
- Provider status is 'inactive' OR
- API key environment variable not set

### Rate limit errors (429)
- OpenRouter free tier: 50 req/day
- Add credits at openrouter.ai
- Check `X-RateLimit-Remaining` header

### Connection refused
- Verify OpenRouter endpoint is correct
- Check network/firewall settings
- Test with `curl https://openrouter.ai/api/v1/models` directly
