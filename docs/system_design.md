# AERIS System Design

> This document explains how AERIS works under the hood — the data flow, caching strategy, scaling approach, and how all the pieces fit together. Written so a new developer can pick up the project and understand the "why" behind every decision.

---

## Table of Contents

1. [The Big Picture](#1-the-big-picture)
2. [Core Design Principle](#2-core-design-principle)
3. [System Architecture Diagram](#3-system-architecture-diagram)
4. [Data Flow: What Happens When a User Opens the App](#4-data-flow)
5. [The Cache Layer (Redis)](#5-the-cache-layer-redis)
6. [Precomputation Scheduler](#6-precomputation-scheduler)
7. [LLM Advisory Caching Strategy](#7-llm-advisory-caching-strategy)
8. [API Design](#8-api-design)
9. [Multi-City Scaling](#9-multi-city-scaling)
10. [Graceful Degradation](#10-graceful-degradation)
11. [Deployment](#11-deployment)
12. [Security](#12-security)
13. [Running Locally (New Developer Guide)](#13-running-locally)
14. [Performance Results](#14-performance-results)

---

## 1. The Big Picture

AERIS is an air quality intelligence platform. Under the hood, it:

1. **Ingests** AQI data from monitoring stations (OpenAQ, CPCB)
2. **Predicts** what AQI will be tomorrow using ML models
3. **Explains** why AQI is bad at a location (source attribution)
4. **Recommends** where to send enforcement teams
5. **Advises** citizens in their language about health precautions

All of this happens through a **multi-agent AI system** where 4 agents collaborate in a chain:

```
Forecast Agent → Attribution Agent → Enforcement Agent → Advisory Agent (LLM)
```

The key engineering challenge: how do you serve thousands of citizens without running expensive model inference and LLM calls on every request?

**Answer: Precompute everything, serve from Redis cache.**

---

## 2. Core Design Principle

> **"Do the expensive work once on a schedule. User requests become cache reads."**

Air quality doesn't change second-to-second. AQI updates hourly. Forecasts are daily. So why would we recompute predictions for every user click?

Instead:
- A **scheduler** runs the full agent pipeline every few hours
- Results are stored in **Redis** with appropriate TTLs
- When a citizen opens the app, they get a **< 5ms cache read** instead of waiting 3-8 seconds for live computation

This single decision is what allows AERIS to scale from 1 user to millions without increasing compute cost.

---

## 3. System Architecture Diagram

```
┌────────────────────── EXTERNAL SOURCES ──────────────────────┐
│  OpenAQ (AQI) │ Open-Meteo (Weather) │ NASA FIRMS (Fires)   │
│  OSM (Land use) │ Google Gemini (LLM)                        │
└──────┬────────────────┬───────────────────┬──────────────────┘
       │                │                   │
       ▼                ▼                   │
┌──────────────────────────────────┐        │
│     PRECOMPUTATION SCHEDULER     │        │
│                                  │        │
│  Runs every 6 hours:             │        │
│  1. Forecast all 94 stations     │        │
│  2. Attribute sources per station│        │
│  3. Rank enforcement priorities  │        │
│  4. Generate LLM advisories      │◀───────┘
│  5. Assemble station snapshots   │
│                                  │
└──────────────┬───────────────────┘
               │ writes results
               ▼
┌──────────────────────────────────┐
│          REDIS CACHE             │
│                                  │
│  aeris:forecast:{station_id}     │ ← TTL: 6 hours
│  aeris:attribution:{station_id}  │ ← TTL: 6 hours
│  aeris:snapshot:{station_id}     │ ← TTL: 1 hour
│  aeris:enforcement:city_*        │ ← TTL: 6 hours
│  aeris:advisory:{bucket}:{src}   │ ← TTL: 2 hours
│                                  │
└──────────────┬───────────────────┘
               │ reads (< 5ms)
               ▼
┌──────────────────────────────────┐
│        FastAPI GATEWAY           │
│                                  │
│  GET /api/v1/snapshot/{id}       │ ← One call, full data
│  GET /api/v1/forecast/{id}       │
│  GET /api/v1/advisory?aqi=350    │
│  GET /api/v1/enforcement         │
│  GET /api/v1/stats               │ ← Cache health
│  POST /api/v1/refresh            │ ← Manual trigger
│                                  │
└──────────────┬───────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌────────────┐  ┌────────────┐
│  Next.js   │  │  Future:   │
│  Frontend  │  │  Mobile    │
│            │  │  IVR/SMS   │
│  Citizen   │  │  Public    │
│  Authority │  │  Displays  │
└────────────┘  └────────────┘
```

---

## 4. Data Flow

### What happens when a citizen opens the app?

```
1. User opens /dashboard
2. Frontend calls: GET /api/v1/snapshot/delhi_anand_vihar
3. API reads from Redis (< 5ms)
4. Returns: { current_aqi, forecast, attribution, advisory }
5. Frontend renders — user sees everything instantly
```

Total time: **< 100ms** (network + cache read). No model inference, no LLM call, no waiting.

### What happens in the background (every 6 hours)?

```
1. Scheduler wakes up
2. For each of 94 stations:
   a. ForecastAgent.predict() → stores in Redis (key: forecast:{station_id})
   b. AttributionAgent.attribute() → stores in Redis (key: attribution:{station_id})
3. EnforcementAgent.rank_city() → stores top 10 recommendations
4. For each of 180 advisory combinations:
   a. AdvisoryAgent.generate() → stores in Redis (key: advisory:{bucket}:{source}:{lang}:{trend})
5. For each station:
   a. Assemble snapshot from all cached data → stores as snapshot:{station_id}
```

---

## 5. The Cache Layer (Redis)

**File: `api/cache.py`**

The cache has two backends:
- **Primary: Redis** — persistent, shared across API workers, survives restarts
- **Fallback: In-memory** — activates automatically if Redis is down

### Why Redis?

| Feature | In-Memory | Redis |
|---------|-----------|-------|
| Survives restart | ❌ | ✅ |
| Shared across workers | ❌ | ✅ |
| Built-in TTL | Manual | ✅ Native |
| Scales horizontally | ❌ | ✅ |
| Monitoring tools | None | redis-cli, RedisInsight |
| Pub/Sub for invalidation | ❌ | ✅ |

### Key naming convention

All keys are prefixed with `aeris:` to avoid collisions:

```
aeris:forecast:delhi_anand_vihar        → forecast data for this station
aeris:attribution:delhi_anand_vihar     → source breakdown
aeris:snapshot:delhi_anand_vihar        → full aggregated station data
aeris:enforcement:city_recommendations  → top 10 enforcement actions
aeris:advisory:very_poor:vehicular_traffic:hi:worsening  → precomputed LLM advisory
```

### TTL strategy (data freshness tiers)

| Data Type | TTL | Why |
|-----------|-----|-----|
| Live AQI (OpenAQ) | 6 hours | Avoid rate-limit bans, data updates hourly |
| Live AQI (fallback) | 12 hours | Dataset doesn't change frequently |
| Forecasts | 6 hours | Models run every 6h |
| Attribution | 6 hours | Feature values stable over hours |
| Enforcement | 6 hours | Priorities shift slowly |
| Advisories | 2 hours | Content may need refresh |
| Snapshots | 6 hours | Assemblage of above |
| Station metadata | 24 hours | Rarely changes |

**Important:** Redis persists to disk (RDB) every 60 seconds. Cache survives server restarts.

### How the fallback works

```python
from cache import get_cache

cache = get_cache()  # Tries Redis → falls back to in-memory
cache.set("mykey", {"data": "value"}, ttl_seconds=3600)
cache.get("mykey")  # Works identically regardless of backend
```

You never need to worry about which backend is active. The interface is identical.

---

## 6. Precomputation Scheduler

**File: `api/scheduler.py`**

The scheduler is the heart of AERIS's performance story. It:

1. Runs on API startup (cache is warm before the first user arrives)
2. Runs again every 6 hours in a background thread
3. Can be triggered manually via `POST /api/v1/refresh`

### What it computes

| Step | What | Count | Where it's stored |
|------|------|-------|-------------------|
| 1 | Forecast (1/2/3 day) per station | 88 stations × 3 days | `forecast:{station_id}` |
| 2 | Source attribution per station | 88 stations (real features) | `attribution:{station_id}` |
| 3 | Enforcement priorities (city-wide) | Top 10 ranked | `enforcement:city_recommendations` |
| 4 | LLM advisories (all combos) | Up to 180 | `advisory:{bucket}:{src}:{lang}:{trend}` |
| 5 | Aggregate snapshots | 88 stations | `snapshot:{station_id}` |

### Time to complete

On a MacBook Air: **< 0.3 seconds** for all 88 stations (with trained XGBoost model).

### Live AQI data (separate from precomputation)

The `/api/live/cities` endpoint handles real-time map data:
- **Primary:** OpenAQ v3 API (all India, 600+ stations) — cached 6 hours
- **Fallback:** Latest PM2.5 from `ml_dataset_cleaned.csv` — cached 12 hours
- The map **never** shows empty. Fallback activates automatically on API failure.
- No aggressive polling — only fetches when cache is completely expired.

---

## 7. LLM Advisory Caching Strategy

This is the cleverest optimization in the system.

### The problem
Gemini LLM calls take 2-5 seconds each. If 10,000 citizens query simultaneously, that's 10,000 API calls to Google ($$ and slow).

### The solution
**Bucket AQI into ranges.** AQI 347 and AQI 352 are effectively the same advisory.

```
AQI 0-50     → "good" bucket
AQI 51-100   → "satisfactory" bucket  
AQI 101-200  → "moderate" bucket
AQI 201-300  → "poor" bucket
AQI 301-400  → "very_poor" bucket
AQI 401-500  → "severe" bucket
```

### Cache key formula

```
advisory:{aqi_bucket}:{dominant_source}:{language}:{trend}
```

### Total combinations

```
6 AQI buckets × 5 sources × 2 languages × 3 trends = 180 unique advisories
```

We precompute ALL 180 on startup. After that, **every advisory request is a cache hit. Zero LLM calls during user traffic.**

### What this means

| Scenario | LLM Calls | Latency |
|----------|-----------|---------|
| Without caching | 1 per user request | 2-5s |
| With caching | 180 total (precomputed) | < 5ms |
| Peak load (10,000 users) | 0 additional | < 5ms |

---

## 8. API Design

### The aggregate endpoint (most important)

```
GET /api/v1/snapshot/{station_id}
```

Returns everything the frontend needs in **one call**:

```json
{
  "station": { "id": "...", "name": "...", "lat": 28.64, "lon": 77.31 },
  "current_aqi": 364,
  "forecast": { "predictions": [...] },
  "attribution": { "vehicular_traffic": 26.0, ... },
  "advisory_summary": "AQI 364 — बहुत अस्वस्थ...",
  "computed_at": "2026-06-29T21:14:04",
  "served_from": "cache",
  "cache_source": "precomputed"
}
```

This eliminates the "waterfall" pattern where the frontend makes 4 sequential API calls. One call = complete dashboard render.

### All endpoints

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `GET /api/v1/snapshot/{station_id}` | Full station data | Any |
| `GET /api/v1/forecast/{station_id}` | Cached forecast only | Any |
| `GET /api/v1/attribution/{station_id}` | Cached attribution only | Any |
| `GET /api/v1/enforcement` | City-wide recommendations | Authority |
| `GET /api/v1/advisory?aqi=350&language=hi&source=...&trend=...` | Bucketed advisory | Any |
| `GET /api/v1/stats` | Cache health metrics | Admin |
| `POST /api/v1/refresh` | Trigger precomputation | Admin |
| `GET /api/agents/pipeline/{station_id}` | Live agent pipeline (bypasses cache) | Admin |
| `GET /api/agents/status` | Agent health check | Any |

### Rate limiting tiers

| Tier | Limit | Use Case |
|------|-------|----------|
| Public | 30 req/min | Unauthenticated |
| Citizen | 120 req/min | Normal dashboard |
| Authority | 300 req/min | Operational dashboard |
| Internal | Unlimited | Precompute workers |

---

## 9. Multi-City Scaling

Currently AERIS runs for Delhi (30 stations). Here's how it scales to 50 cities.

### Architecture change

The scheduler becomes city-aware:

```python
cities = ["delhi", "mumbai", "kolkata", "bengaluru", ...]

for city in cities:
    stations = load_stations(city)
    precompute_all(stations)  # same pipeline, different data
```

### Key namespacing for multi-city

```
aeris:forecast:delhi:delhi_anand_vihar
aeris:forecast:mumbai:mumbai_bandra
aeris:snapshot:kolkata:kolkata_jadavpur
```

### Model strategy

| Approach | When to use |
|----------|------------|
| Shared model + city feature | Default — one model, all cities |
| Per-city model | When a city's RMSE is unacceptable with shared model |

### Compute budget (50 cities, avg 50 stations)

```
Forecasts:    50 cities × 50 stations × 3 days = 7,500 inferences per cycle
Attribution:  50 × 50 = 2,500 SHAP computations per cycle
Advisories:   180 per city = 9,000 total (but identical across cities, so still just 180)
```

**Advisories don't scale with cities** — "very poor AQI from traffic in Hindi" is the same advisory whether you're in Delhi or Mumbai. This is why the bucketing strategy is so powerful.

### Redis scaling

- Single Redis instance handles 100K+ keys easily
- For extreme scale: Redis Cluster with sharding by city prefix
- Cloud options: Upstash (serverless, free tier), Railway Redis, AWS ElastiCache

---

## 10. Graceful Degradation

Every external dependency can fail. AERIS never shows an error to users — it degrades gracefully through fallback chains:

```
┌─ Forecast ────────────────────────────────────────────────┐
│  Level 1: Trained XGBoost model (xgb_day1.joblib)         │
│  Level 2: Current PM2.5 with decay (when model undershoots)│
│  Level 3: Last cached forecast from Redis                 │
│  Level 4: Mock predictions (deterministic, station-based) │
└───────────────────────────────────────────────────────────┘

┌─ Attribution ─────────────────────────────────────────────┐
│  Level 1: SHAP explainer (if shap_explainer.joblib exists)│
│  Level 2: Feature-group heuristic (real features per stn) │
│  Level 3: Deterministic mock based on station profile     │
└───────────────────────────────────────────────────────────┘

┌─ Live AQI (Map) ─────────────────────────────────────────┐
│  Level 1: OpenAQ v3 API (600+ India stations)             │
│  Level 2: Dataset fallback (88 Delhi stations from CSV)   │
│  Never shows empty map.                                   │
└───────────────────────────────────────────────────────────┘

┌─ Advisory ────────────────────────────────────────────────┐
│  Level 1: Gemini LLM (personalized, context-aware)        │
│  Level 2: Cached advisory from Redis (precomputed)        │
│  Level 3: Template fallback (hardcoded per language)      │
└───────────────────────────────────────────────────────────┘

┌─ Cache ───────────────────────────────────────────────────┐
│  Level 1: Redis (persistent, shared, survives restarts)   │
│  Level 2: In-memory LRU (automatic fallback)              │
└───────────────────────────────────────────────────────────┘
```

The response always includes `"served_from": "cache" | "live" | "fallback"` so you can monitor degradation.

---

## 11. Deployment

### Local development (current)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Next.js    │     │   FastAPI   │     │   Redis     │
│  :3000      │◀───▶│   :8000     │◀───▶│   :6379     │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Production target

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Vercel    │     │ Cloud Run / │     │  Upstash /  │
│   (CDN)     │◀───▶│  Railway    │◀───▶│  ElastiCache│
│  Frontend   │     │   API       │     │   Redis     │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │  Scheduler  │
                    │  (Worker)   │
                    └─────────────┘
```

### Cost estimate (50 cities, production)

| Component | Monthly |
|-----------|---------|
| Frontend (Vercel) | $0 (free tier) |
| API (Cloud Run) | $30-50 |
| Redis (Upstash) | $10-20 |
| Gemini API | $0 (free tier covers precomputed calls) |
| Model inference | $20-40 |
| **Total** | **~$60-110/month** |

For serving millions of citizens across 50 cities.

---

## 12. Security

| Concern | How we handle it |
|---------|-----------------|
| API keys (Gemini) | `.env` file, never committed to git |
| Auth bypass | JWT with role claims + middleware |
| Redis access | Localhost only (no external exposure in dev) |
| Rate limiting | Per-IP + per-user (tiered by role) |
| Data poisoning | Validate ingested AQI against historical bounds |
| LLM injection | Structured prompts only, no user input in system prompt |
| Cache poisoning | Only scheduler writes to cache, API only reads |

---

## 13. Running Locally (New Developer Guide)

### Prerequisites

- Node.js 18+ (for frontend)
- Python 3.9+ (for API)
- Redis (for cache)

### Step 1: Start Redis

```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis

# Verify
redis-cli ping  # Should return: PONG
```

### Step 2: Start the API

```bash
cd api

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env  # or create .env with your GEMINI_API_KEY

# Start server (auto-precomputes cache on startup)
python3 -m uvicorn main:app --reload --port 8000
```

On startup you'll see:
```
✓ Redis cache connected: redis://localhost:6379/0
🚀 AERIS API starting...
   Running initial precomputation...
   ✓ 30 station forecasts cached
   ✓ 30 station attributions cached
   ✓ 10 enforcement recommendations ranked
   ✓ 180 advisory variants cached
   ✓ 30 station snapshots assembled
   Done in 0.05s | Cache: 271 entries | Hit rate: 100%
✓ Scheduler started (interval: 21600s)
INFO: Uvicorn running on http://127.0.0.1:8000
```

### Step 3: Start the Frontend

```bash
cd frontend
npm install
npm run seed    # Creates demo accounts (first time only)
npm run dev     # http://localhost:3000
```

### Step 4: Verify everything works

```bash
# Check API health
curl http://localhost:8000/health

# Get a station snapshot (should return instantly from cache)
curl http://localhost:8000/api/v1/snapshot/delhi_anand_vihar

# Check cache stats
curl http://localhost:8000/api/v1/stats

# Check Redis directly
redis-cli keys "aeris:*" | wc -l  # Should show 271 keys
```

### If Redis isn't running

The system still works — it falls back to in-memory cache. You'll see:
```
⚠ Redis unavailable, using in-memory fallback
```

Everything functions identically, but cache doesn't persist across restarts.

---

## 14. Performance Results

### Tested on MacBook Air (M-series)

| Metric | Value |
|--------|-------|
| Full precomputation (88 stations) | 0.23 seconds |
| Cache entries after precompute | ~500 |
| Advisory variants pre-cached | 180 |
| Redis cache hit rate (steady state) | 100% |
| User request latency (from Redis) | < 5ms |
| User request latency (live pipeline) | 3-8 seconds |
| Live AQI stations (OpenAQ) | 200-600 (India) |
| Live AQI stations (fallback) | 88 (Delhi, always available) |

### Latency comparison

```
Without cache (live pipeline per request):
  Model inference:  200-500ms
  SHAP computation: 1-2s
  LLM API call:     2-5s
  Total:            3-8 seconds

With precompute + Redis cache:
  Redis GET:        < 5ms
  Total:            < 5ms

Improvement: 600-1600× faster
```

### What this means at scale

| Users hitting the API | Without cache | With Redis cache |
|-----------------------|---------------|-----------------|
| 1 | 5s | 5ms |
| 100 concurrent | 100 × 5s = overload | 100 × 5ms = 0.5s total |
| 10,000 concurrent | System crashes | 10,000 × 5ms = handled easily |

The precompute + cache architecture means **compute cost is fixed** regardless of how many users are online. You pay for 1 precomputation cycle, not N user requests.
