"""
AERIS — Urban AQI Intelligence Platform API
FastAPI backend serving predictions, source attribution, enforcement intel, and advisories.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import stations, forecast, attribution, enforcement, advisory, agents

app = FastAPI(
    title="AERIS API",
    description="Urban AQI Intelligence Platform — Predictions, Attribution & Advisories",
    version="0.1.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(stations.router, prefix="/api/stations", tags=["Stations"])
app.include_router(forecast.router, prefix="/api/forecast", tags=["Forecast"])
app.include_router(attribution.router, prefix="/api/attribution", tags=["Attribution"])
app.include_router(enforcement.router, prefix="/api/enforcement", tags=["Enforcement"])
app.include_router(advisory.router, prefix="/api/advisory", tags=["Advisory"])
app.include_router(agents.router, prefix="/api/agents", tags=["Multi-Agent Pipeline"])


@app.get("/")
async def root():
    return {
        "name": "AERIS API",
        "version": "0.1.0",
        "status": "running",
        "endpoints": [
            "/api/stations",
            "/api/forecast",
            "/api/attribution",
            "/api/enforcement",
            "/api/advisory",
        ],
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
