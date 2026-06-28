# AERIS Multi-Agent Architecture

## Overview

AERIS uses a **4-agent pipeline** orchestrated by a central coordinator. Each agent has a single responsibility and passes structured context downstream, enabling evidence-based reasoning at every stage.

## Agent Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│                      AERIS ORCHESTRATOR                           │
│          Coordinates pipeline, manages context flow               │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│   ┌───────────────┐         ┌────────────────────┐               │
│   │  1. FORECAST  │────────▶│  2. ATTRIBUTION    │               │
│   │    Agent      │         │      Agent         │               │
│   └───────────────┘         └────────────────────┘               │
│         │                            │                            │
│         │    predicted AQI           │   source breakdown         │
│         │    (1/2/3 day)             │   (SHAP values)            │
│         │                            │                            │
│         ▼                            ▼                            │
│   ┌──────────────────────────────────────────────┐               │
│   │           3. ENFORCEMENT Agent                │               │
│   │   Consumes: forecast + attribution            │               │
│   │   Outputs: prioritized action recommendations │               │
│   └──────────────────────────────────────────────┘               │
│                          │                                        │
│                          ▼                                        │
│   ┌──────────────────────────────────────────────┐               │
│   │           4. ADVISORY Agent (LLM)             │               │
│   │   Consumes: ALL upstream outputs              │               │
│   │   Outputs: natural language health advisory   │               │
│   │   Powered by: Google Gemini                   │               │
│   └──────────────────────────────────────────────┘               │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

## Agent Responsibilities

### 1. Forecast Agent (`forecast_agent.py`)

| Aspect | Detail |
|--------|--------|
| **Input** | Station ID, 72 engineered features |
| **Output** | 1/2/3 day PM2.5 predictions with confidence intervals |
| **Model** | XGBoost / LightGBM (loaded from `.joblib`) |
| **Fallback** | Deterministic mock when model unavailable |
| **Key Logic** | PM2.5 → AQI conversion using Indian NAQI breakpoints |

Features used (72 total):
- Temporal lags: pm25 (1/2/3/7d), pm10/no2/o3 (1d)
- Rolling stats: mean/std (3/7d), shifted to avoid leakage
- Time encodings: day_of_week, month, season, cyclic sin/cos
- Wind decomposition: x/y components, calm indicator, stagnation index
- Interactions: inversion proxy, fire dispersion, temp range
- Deltas: day-over-day change, persistence ratio
- Static (OSM): road density, highway km, industrial/construction/green counts

### 2. Attribution Agent (`attribution_agent.py`)

| Aspect | Detail |
|--------|--------|
| **Input** | Feature vector for the station |
| **Output** | Source breakdown as percentages (sums to 100%) |
| **Method** | SHAP feature grouping |
| **Fallback** | Feature-magnitude heuristic → deterministic mock |

Feature → Source mapping:
- `road_density_*`, `highway_km_*` → **Vehicular Traffic**
- `industrial_count_*` → **Industrial Emissions**
- `construction_count_*` → **Construction Dust**
- `fire_count*`, `fire_dispersion_*` → **Biomass Burning**
- `wind_*`, `temperature_*`, `humidity_*`, `inversion_*` → **Weather-driven**
- `no2*`, `o3*` → **Secondary Particles**

### 3. Enforcement Agent (`enforcement_agent.py`)

| Aspect | Detail |
|--------|--------|
| **Input** | Forecast predictions + source attribution |
| **Output** | Ranked enforcement recommendations with evidence |
| **Logic** | `priority_score = (predicted_aqi × 0.6) + (actionable_source_pct × 2.0)` |
| **Key Feature** | Only recommends actions for actionable sources (excludes weather) |

Actionable source → Action mapping:
- Vehicular Traffic → traffic diversion, emission checkpoints, odd-even
- Industrial → emission inspections, DG set compliance
- Construction → dust suppression, site compliance
- Biomass Burning → patrol, satellite hotspot response

### 4. Advisory Agent (`advisory_agent.py`)

| Aspect | Detail |
|--------|--------|
| **Input** | AQI, trend, dominant source, full attribution, language |
| **Output** | Natural language health advisory |
| **LLM** | Google Gemini 2.0 Flash (free tier) |
| **Languages** | English, Hindi (extensible to Kannada, Tamil) |
| **Fallback** | Template-based advisory when API unavailable |

The LLM prompt includes:
- Current AQI with severity level
- 24-72h trend (improving / stable / worsening)
- Dominant pollution source and full breakdown
- Language instruction

## Data Flow (Single Station Query)

```
User Request: "What's the air quality at Anand Vihar?"
         │
         ▼
┌─ Orchestrator ─────────────────────────────────────────────┐
│                                                             │
│  Step 1: ForecastAgent.predict("delhi_anand_vihar")         │
│          → {day1: AQI 364, day2: AQI 362, day3: AQI 361}   │
│                                                             │
│  Step 2: AttributionAgent.attribute(features)               │
│          → {vehicular: 26%, weather: 24%,                   │
│             industrial: 14.4%, biomass: 14.4%, ...}         │
│                                                             │
│  Step 3: EnforcementAgent.generate(forecast + attribution)  │
│          → [#1 traffic police, #2 DG set check,             │
│             #3 burning hotspot patrol]                       │
│                                                             │
│  Step 4: AdvisoryAgent.generate(all_context, language="hi") │
│          → "AQI 364 — बहुत अस्वस्थ। वाहन प्रदूषण मुख्य     │
│             कारण है। बाहर N95 मास्क अनिवार्य..."             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/agents/pipeline/{station_id}` | Full 4-agent pipeline |
| `GET /api/agents/advisory/{station_id}?aqi=350&language=hi` | Advisory only |
| `GET /api/agents/enforcement/city` | City-wide enforcement priorities |
| `GET /api/agents/status` | All agent health status |

## Model Integration

When trained models are available, drop them into `/models`:

```
models/
├── xgb_1day.joblib      ← Day-1 forecast model
├── xgb_2day.joblib      ← Day-2 forecast model
├── xgb_3day.joblib      ← Day-3 forecast model
└── shap_explainer.joblib ← SHAP TreeExplainer for attribution
```

Agents auto-detect and load these on startup. No code changes needed.

## Why Multi-Agent?

| Single Model Approach | Multi-Agent Approach |
|----------------------|---------------------|
| Prediction only | Prediction + explanation + action + communication |
| No accountability | Each agent has clear responsibility |
| Monolithic | Agents can be upgraded independently |
| English only | LLM handles any language dynamically |
| Static output | Context flows downstream, enriching each step |

The multi-agent design ensures that enforcement recommendations are always grounded in forecast evidence, and citizen advisories always explain the *why* (source attribution) not just the *what* (AQI number).
