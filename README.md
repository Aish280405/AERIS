# AERIS — Urban AQI Intelligence Platform

AI-powered Air Quality Intelligence for Indian cities. Fuses monitoring station data, satellite imagery, weather, and land-use to move from reactive monitoring to proactive, evidence-based intervention.

## Problem

India's air quality crisis affects all major urban centres. Despite 900+ monitoring stations (CAAQMS), only 31% of cities have actionable response protocols linked to readings. The data exists — the intelligence layer does not.

AERIS provides that intelligence layer: **geospatial source attribution**, **predictive forecasting**, **enforcement intelligence**, and **citizen health advisories** — powered by a multi-agent AI system.

## Architecture

```
AERIS/
├── agents/              ← Multi-agent AI system (4 agents + orchestrator)
│   ├── orchestrator.py  ← Pipeline coordinator
│   ├── forecast_agent.py
│   ├── attribution_agent.py
│   ├── enforcement_agent.py
│   ├── advisory_agent.py     (Gemini LLM)
│   └── agent_arch.md         ← Detailed architecture doc
├── api/                 ← FastAPI backend
│   ├── main.py
│   └── routers/         ← stations, forecast, attribution, enforcement, advisory, agents
├── frontend/            ← Next.js web dashboard
│   └── src/
│       ├── app/         ← Pages (landing, login, signup, dashboard)
│       ├── components/  ← UI components (map, panels, AI assistant)
│       └── lib/         ← Utilities, auth, theme, data
├── models/              ← Trained model files (.joblib) — added after training
└── data/                ← Static data (30 Delhi stations with coordinates)
```

## Multi-Agent Pipeline

```
Forecast Agent → Attribution Agent → Enforcement Agent → Advisory Agent (LLM)
```

Each agent passes structured context downstream:
1. **Forecast** — predicts 1-3 day AQI using XGBoost (72 features)
2. **Attribution** — explains pollution sources via SHAP grouping
3. **Enforcement** — prioritizes where to deploy inspectors
4. **Advisory** — generates natural-language health alerts (Gemini, multi-language)

See [`agents/agent_arch.md`](agents/agent_arch.md) for full architecture details.

## Features

| Feature | Description |
|---------|-------------|
| **Map Dashboard** | 30 Delhi stations color-coded by real-time AQI |
| **AQI Forecasting** | 1/2/3 day predictions at station level |
| **Source Attribution** | SHAP-based pollution source breakdown |
| **Enforcement Intel** | Ranked action recommendations with evidence |
| **Health Advisory** | LLM-generated alerts in Hindi & English |
| **Role-Based Access** | Citizen view (personal) vs Authority view (operational) |
| **AI Assistant** | Chat interface for querying the agent system |

## Quick Start

### Backend
```bash
cd api
pip install -r requirements.txt
echo "GEMINI_API_KEY=your_key" > .env
python3 -m uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run seed          # Creates demo accounts
npm run dev           # Starts at http://localhost:3000
```

### Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Citizen | citizen@aeris.io | password123 |
| Authority | admin@aeris.io | password123 |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, Tailwind CSS, Leaflet, Recharts |
| Backend | FastAPI, Python |
| ML Models | XGBoost / LightGBM (training on Kaggle) |
| LLM | Google Gemini 2.0 Flash |
| Auth | NextAuth.js (JWT, bcrypt) |
| Data Sources | OpenAQ, Open-Meteo, NASA FIRMS, OpenStreetMap, CPCB |

## Data Pipeline (separate repo)

- **merged_dataset.csv**: 64,459 rows × 28 cols (station × date, Delhi, 2018-2026)
- **ml_dataset.csv**: 39,448 rows × 72 cols (feature-engineered)
- 94 stations with lat/lon across Delhi
- Sources: OpenAQ, Open-Meteo, NASA FIRMS, OSM

## Model Integration

Drop trained models into `/models` — agents auto-detect on startup:
```
models/
├── xgb_1day.joblib
├── xgb_2day.joblib
├── xgb_3day.joblib
└── shap_explainer.joblib
```

Baseline persistence RMSE = 83.38. Target: beat this significantly with trained models.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/stations` | Station metadata |
| `GET /api/forecast/{station_id}` | AQI predictions |
| `GET /api/attribution/{station_id}` | Source breakdown |
| `GET /api/enforcement` | Deployment recommendations |
| `GET /api/advisory/{station_id}` | Health advisories |
| `GET /api/agents/pipeline/{station_id}` | Full multi-agent pipeline |
| `GET /api/agents/status` | Agent health check |

## Evaluation Metrics

| Metric | Target |
|--------|--------|
| Forecast RMSE | < 83.38 (persistence baseline) |
| Source Attribution | Validated against SHAP feature groups |
| Enforcement Quality | Prioritized by score, actionable sources only |
| Advisory Coverage | Hindi + English, context-aware |
| Response Time | Signal → intervention recommendation in seconds |

