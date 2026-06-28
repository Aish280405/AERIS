# AERIS — Urban AQI Intelligence Platform

AI-powered Air Quality Intelligence for Indian cities. Provides geospatial pollution source attribution, predictive AQI forecasting, enforcement intelligence, and citizen health advisories.

## Architecture

```
AERIS/
├── frontend/          → Next.js web dashboard (maps, forecasts, advisories)
├── api/               → FastAPI backend (predictions, attribution, data serving)
├── agents/            → AI agents (source attribution, enforcement, advisory)
├── models/            → Trained model files (.joblib) — added after training
├── data/              → Static data (station list, precomputed results)
└── docs/              → Documentation
```

## Quick Start

### Backend (FastAPI)
```bash
cd api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

## Features
- **Map Dashboard** — Stations color-coded by real-time AQI
- **Forecast View** — 1/2/3 day PM2.5 predictions per station
- **Source Attribution** — Pollution source breakdown (traffic, industrial, fires, weather)
- **Enforcement Panel** — Prioritized inspector deployment recommendations
- **Citizen Advisory** — Ward-level health alerts in Hindi & English

## Tech Stack
- **Frontend:** Next.js 14, React, Leaflet, Tailwind CSS, Recharts
- **Backend:** FastAPI, Python, scikit-learn/XGBoost/LightGBM
- **AI/LLM:** GPT/Claude API for advisory generation
- **Data:** OpenAQ, Open-Meteo, NASA FIRMS, OpenStreetMap
