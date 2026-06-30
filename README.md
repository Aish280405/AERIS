# AERIS — Urban AQI Intelligence Platform

AI-powered Air Quality Intelligence for Indian cities. Fuses monitoring station data, satellite imagery, weather, and land-use to move from reactive monitoring to proactive, evidence-based intervention.

---

## The Problem

India loses 1.67 million lives annually to air pollution. CPCB has 900+ monitoring stations but only 31% of cities have actionable protocols linked to readings. **The data exists. The intelligence layer does not.**

AERIS provides that layer: geospatial source attribution, predictive forecasting, enforcement intelligence, and citizen health advisories — all powered by a multi-agent AI system with Redis-backed precomputation.

---

## How It Works (30-second version)

1. A **scheduler** runs every 6 hours, executing a 4-agent AI pipeline for all stations
2. Results are cached in **Redis** (forecasts, attribution, enforcement, advisories)
3. When a user opens the app, they get a **< 5ms cache read** — not a 5-second live computation
4. Citizens see personalized health advice; authorities see enforcement priorities

---

## Architecture

```
AERIS/
├── agents/                  ← Multi-agent AI system
│   ├── orchestrator.py      ← Chains all agents together
│   ├── forecast_agent.py    ← XGBoost PM2.5 prediction (uses xgb_day1.joblib)
│   ├── attribution_agent.py ← Feature-group heuristic source attribution
│   ├── enforcement_agent.py ← Prioritized action recommendations
│   ├── advisory_agent.py    ← LLM-generated health advisories (Gemini)
│   └── agent_arch.md        ← Agent architecture documentation
├── api/                     ← FastAPI backend
│   ├── main.py              ← App entry + startup precomputation
│   ├── cache.py             ← Redis cache layer (with in-memory fallback)
│   ├── scheduler.py         ← Background precomputation engine
│   ├── .env                 ← API keys (GEMINI_API_KEY, OPENAQ_API_KEY, REDIS_URL)
│   └── routers/
│       ├── cached.py        ← Production endpoints (serve from Redis)
│       ├── live.py          ← Live AQI from OpenAQ with dataset fallback
│       ├── stations.py      ← Station metadata (from data/stations.json)
│       ├── chat.py          ← AI chat (Gemini-powered)
│       ├── agents.py        ← Live agent pipeline endpoints
│       └── ...
├── frontend/                ← Next.js web dashboard
│   └── src/
│       ├── app/             ← Pages (landing, login, signup, dashboard)
│       ├── components/      ← Map, panels, AI assistant, citizen dashboard
│       └── lib/
│           ├── data.ts      ← Station list (auto-generated from data/stations.json)
│           ├── api.ts       ← API client functions
│           ├── aqi.ts       ← AQI calculation utilities
│           └── ...
├── models/
│   └── xgb_day1.joblib     ← Trained XGBoost model (61 features, Delhi)
├── data/
│   ├── stations.json        ← 88 station definitions (ID, name, lat/lon)
│   └── ml_dataset_cleaned.csv ← Training dataset (36K rows, 68 cols, 88 stations)
└── docs/
    └── system_design.md     ← Full system design document
```

---

## Multi-Agent Pipeline

```
Forecast Agent ──▶ Attribution Agent ──▶ Enforcement Agent ──▶ Advisory Agent (Gemini LLM)
     │                    │                      │                      │
  predicts AQI      explains WHY         recommends WHERE         tells citizens WHAT
  (1-3 days)     (source breakdown)    (to deploy inspectors)     (in their language)
```

Each agent receives context from upstream agents — enforcement recommendations are always grounded in forecast evidence, and advisories explain the cause (source attribution), not just the number.

See [`agents/agent_arch.md`](agents/agent_arch.md) for full architecture details.

---

## Caching & Performance

AERIS uses a **precompute + Redis cache** architecture:

| Without cache | With Redis cache |
|--------------|-----------------|
| 3-8 seconds per request | < 5ms per request |
| Scales linearly with users | Fixed compute cost |
| LLM call per user | 180 precomputed variants |

The scheduler precomputes on startup:
- 88 station forecasts (XGBoost model with real features from dataset)
- 88 station attributions (feature-group heuristic per station)
- 10 enforcement recommendations (ranked by priority score)
- LLM advisory variants (all AQI bucket × source × language × trend combinations)
- 88 station snapshots (aggregate endpoint)

---

## Live AQI Data

The map shows real-time AQI from two sources:

| Source | When used | Stations | Cache TTL |
|--------|-----------|----------|-----------|
| OpenAQ v3 API | When API key is valid & not rate-limited | 600+ across India | 6 hours |
| Dataset fallback (`ml_dataset_cleaned.csv`) | When OpenAQ is unavailable | 88 Delhi stations | 12 hours |

The system **never shows an empty map**. If OpenAQ is down, rate-limited, or the key is invalid, it falls back to the latest values from your ML dataset.

### OpenAQ Integration

- Auth: `X-API-Key` header
- India country ID: `9`
- Rate limits: ~60 req/min (free tier) — system uses conservative batching (5 concurrent, 12s gaps)
- Background slow-fill: gradually fetches all 600+ Indian stations over ~25 min

### Adding to / Regenerating Station Data

When you add new cities or stations to `ml_dataset_cleaned.csv`:

```bash
# Regenerate stations.json from the dataset
python3 -c "
import json, pandas as pd
df = pd.read_csv('data/ml_dataset_cleaned.csv')
stations = df.groupby('station_id').agg({'city':'first','lat':'first','lon':'first'}).reset_index()
result = [{'station_id':str(int(r.station_id)),'station_name':f'Station {int(r.station_id)}','city':r.city,'lat':round(r.lat,6),'lon':round(r.lon,6),'pollutants':['PM2.5','PM10','NO2']} for _,r in stations.iterrows()]
json.dump(sorted(result,key=lambda x:x['station_name']),open('data/stations.json','w'),indent=2)
print(f'Generated {len(result)} stations')
"

# Then regenerate frontend data.ts
python3 -c "
import json
with open('data/stations.json') as f: stations = json.load(f)
lines = ['export interface Station {','  station_id: string;','  station_name: string;','  city: string;','  lat: number;','  lon: number;','  pollutants: string[];','}','','export const stations: Station[] = [']
for s in stations: lines.append(f'  {{ station_id: \"{s[\"station_id\"]}\", station_name: \"{s[\"station_name\"]}\", city: \"{s[\"city\"]}\", lat: {s[\"lat\"]}, lon: {s[\"lon\"]}, pollutants: {json.dumps(s[\"pollutants\"])} }},')
lines += ['];','','export function useStations(): Station[] { return stations; }','export async function fetchStations(): Promise<Station[]> { return stations; }']
open('frontend/src/lib/data.ts','w').write('\n'.join(lines))
print(f'Written {len(stations)} stations to frontend/src/lib/data.ts')
"

# Refresh backend cache
curl -X POST http://localhost:8000/api/v1/refresh
```

See [`docs/system_design.md`](docs/system_design.md) for the complete system design.

---

## Quick Start

### Prerequisites

- Node.js 18+ (frontend)
- Python 3.9+ (backend)
- Redis (cache) — `brew install redis` on macOS

## Full Setup Guide (from scratch)

Follow these steps to get AERIS running on your machine from a fresh clone.

### Prerequisites

Make sure these are installed:

| Tool | Version | Check | Install |
|------|---------|-------|---------|
| Node.js | 18+ | `node --version` | [nodejs.org](https://nodejs.org) |
| Python | 3.9+ | `python3 --version` | [python.org](https://python.org) |
| Redis | 7+ | `redis-cli --version` | `brew install redis` (macOS) |
| Git | any | `git --version` | [git-scm.com](https://git-scm.com) |
| pip | any | `pip3 --version` | Comes with Python |

### Step 1: Clone the repository

```bash
git clone https://github.com/Aish280405/AERIS.git
cd AERIS
```

### Step 2: Install and start Redis

**macOS (Homebrew):**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**Windows (WSL recommended):**
```bash
# Inside WSL
sudo apt install redis-server
sudo service redis-server start
```

**Verify Redis is running:**
```bash
redis-cli ping
# Expected output: PONG
```

> If you can't install Redis, that's okay — the system automatically falls back to an in-memory cache. You'll just lose persistence across restarts.

### Step 3: Set up the Backend (FastAPI)

```bash
cd api

# Create a Python virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# Install all Python dependencies
pip install -r requirements.txt
```

**Configure environment variables:**

```bash
# Create .env file
cat > .env << EOF
# Google Gemini API key (free at https://aistudio.google.com/apikey)
# Optional — system works without it using template fallback
GEMINI_API_KEY=your_gemini_api_key_here

# Redis connection (default local)
REDIS_URL=redis://localhost:6379/0
EOF
```

> To get a free Gemini API key: go to https://aistudio.google.com/apikey, sign in with Google, click "Create API Key". It's instant and free.

**Start the API server:**

```bash
python3 -m uvicorn main:app --reload --port 8000
```

You should see:
```
✓ Redis cache connected: redis://localhost:6379/0
🚀 AERIS API starting...
   Running initial precomputation...
    ✓ 30 station forecasts cached
    ✓ 30 station attributions cached
    ✓ 10 enforcement recommendations ranked
    ✓ 180 advisory variants cached
    ✓ 30 station snapshots assembled
INFO: Uvicorn running on http://127.0.0.1:8000
```

**Verify the API works:**
```bash
# In a new terminal
curl http://localhost:8000/health
# Expected: {"status":"healthy","cache_size":271,"cache_hit_rate":"100.0%"}
```

### Step 4: Set up the Frontend (Next.js)

```bash
# From project root
cd frontend

# Install Node.js dependencies
npm install

# Seed demo user accounts (only needed once)
npm run seed
```

You should see:
```
✅ Seeded 2 demo users
   citizen@aeris.io / password123 (citizen)
   admin@aeris.io / password123 (authority)
```

**Create frontend environment file:**

```bash
cat > .env.local << EOF
NEXTAUTH_SECRET=aeris-hackathon-secret-change-in-production-2024
NEXTAUTH_URL=http://localhost:3000
EOF
```

**Start the frontend:**

```bash
npm run dev
```

You should see:
```
▲ Next.js 14.x
- Local: http://localhost:3000
✓ Ready
```

### Step 5: Open in browser

1. Go to **http://localhost:3000**
2. You'll see the landing page
3. Click "Sign In"
4. Use demo credentials:
   - **Citizen view:** `citizen@aeris.io` / `password123`
   - **Authority view:** `admin@aeris.io` / `password123`

### Step 6: Verify everything is connected

| Check | URL | Expected |
|-------|-----|----------|
| Landing page | http://localhost:3000 | Hero section with features |
| API health | http://localhost:8000/health | `"status": "healthy"` |
| API docs (Swagger) | http://localhost:8000/docs | Interactive API explorer |
| Cache stats | http://localhost:8000/api/v1/stats | 271 entries, 100% hit rate |
| Station snapshot | http://localhost:8000/api/v1/snapshot/delhi_anand_vihar | Full station data |
| Redis keys | `redis-cli keys "aeris:*" \| wc -l` | 271 |

### Troubleshooting

| Problem | Solution |
|---------|----------|
| `redis-cli: command not found` | Install Redis (see Step 2) |
| `⚠ Redis unavailable, using in-memory fallback` | Redis isn't running — start it or ignore (works without it) |
| `ModuleNotFoundError` | Activate your venv: `source venv/bin/activate` |
| `NEXTAUTH_SECRET` error | Make sure `.env.local` exists in `frontend/` |
| Port 3000 already in use | Kill existing process: `lsof -i :3000` then `kill <PID>` |
| Port 8000 already in use | Kill existing process: `lsof -i :8000` then `kill <PID>` |
| `npm run seed` fails | Run from inside `frontend/` directory |
| Login says "Invalid credentials" | Run `npm run seed` again to recreate demo accounts |

### Optional: Add trained models

The project ships with `models/xgb_day1.joblib` (trained XGBoost, 61 features). For multi-day models or SHAP:

```bash
cp ~/Downloads/xgb_day2.joblib models/
cp ~/Downloads/xgb_day3.joblib models/
cp ~/Downloads/shap_explainer.joblib models/
```

Restart the API — agents auto-detect and use them. The forecast agent uses day-1 model for all days if day-2/3 models are missing (with lag-shifted features for variation).

**Important:** `xgboost` must be installed (`pip install xgboost`). The requirements.txt includes it.

---

### 4. Demo Accounts

| Role | Email | Password | What they see |
|------|-------|----------|--------------|
| Citizen | citizen@aeris.io | password123 | Personal AQI + forecast + advisory |
| Authority | admin@aeris.io | password123 | Full dashboard + map + enforcement |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14, React, Tailwind, Leaflet | SSR, fast, map-ready |
| Backend | FastAPI, Python | Async, fast, ML-friendly |
| Cache | Redis | Persistent, shared, TTL-native |
| ML Models | XGBoost / LightGBM | Fast inference, SHAP-compatible |
| LLM | Google Gemini 2.0 Flash | Free tier, fast, multilingual |
| Auth | NextAuth.js (JWT, bcrypt) | Role-based, secure |
| Data | OpenAQ, Open-Meteo, NASA FIRMS, OSM | Open, reliable |

---

## API Endpoints

### Production (served from Redis cache, < 5ms)

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/snapshot/{station_id}` | Full station data in one call |
| `GET /api/v1/forecast/{station_id}` | Cached forecast |
| `GET /api/v1/attribution/{station_id}` | Cached source breakdown |
| `GET /api/v1/enforcement` | City-wide ranked recommendations |
| `GET /api/v1/advisory?aqi=350&language=hi` | Precomputed advisory |
| `GET /api/v1/stats` | Cache health metrics |
| `POST /api/v1/refresh` | Trigger manual precomputation |

### Agent Pipeline (live computation, on-demand)

| Endpoint | Description |
|----------|-------------|
| `GET /api/agents/pipeline/{station_id}` | Full 4-agent pipeline |
| `GET /api/agents/advisory/{station_id}?aqi=350&language=hi` | Live LLM advisory |
| `GET /api/agents/enforcement/city` | Live enforcement ranking |
| `GET /api/agents/status` | Agent health check |

### Interactive docs

Start the API and visit `http://localhost:8000/docs` for Swagger UI.

---

## Data Pipeline

- **36,821 rows** × 68 columns (station × date, Delhi, 2018-2026)
- **88 monitoring stations** across Delhi with lat/lon coordinates
- **61 model features** (lags, rolling stats, wind decomposition, fire interactions, land-use from OSM)
- Station IDs are OpenAQ numeric IDs (e.g., `235` = Anand Vihar)
- Feature engineering avoids leakage (all rolling stats shifted)

---

## Model Integration

The trained model lives at `models/xgb_day1.joblib`:

- **Type:** XGBRegressor
- **Features:** 61 (from `ml_dataset_cleaned.csv` columns)
- **Target:** `target_pm25_next_1` (next-day PM2.5)
- **Stations:** 88 Delhi stations (matched by numeric ID)

The forecast agent:
1. Loads the model + latest features per station from the CSV
2. For day 1: feeds real features directly
3. For day 2-3: shifts lag features forward using the previous prediction
4. Floors negative predictions to a decay from current PM2.5 (model sometimes undershoots for clean stations)

---

## Features

| Feature | Citizen View | Authority View |
|---------|-------------|---------------|
| Location picker (88 stations) | ✅ | — |
| Personal AQI + ring gauge | ✅ | — |
| 3-day forecast cards (XGBoost) | ✅ | ✅ (detailed) |
| Health advisory (Hindi/English) | ✅ | ✅ |
| Pollutant levels | ✅ | ✅ |
| Map dashboard (88+ stations, live) | — | ✅ |
| Source attribution (donut + bars) | — | ✅ |
| Enforcement panel (ranked) | — | ✅ |
| AI Assistant chat (Gemini) | ✅ | ✅ |
| Dark/light theme | ✅ | ✅ |

---


## Contributing / Onboarding

New to the project? Start here:

1. Read [`docs/system_design.md`](docs/system_design.md) — explains the "why" behind every decision
2. Read [`agents/agent_arch.md`](agents/agent_arch.md) — explains the agent pipeline
3. Run the Quick Start above
4. Hit `http://localhost:8000/docs` to explore the API
5. Check `http://localhost:8000/api/v1/stats` to verify cache health

---

## License

Hackathon project — built for the Urban Air Quality Intelligence challenge.
