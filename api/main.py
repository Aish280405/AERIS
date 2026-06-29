"""
AERIS — Urban AQI Intelligence Platform API
FastAPI backend serving predictions, source attribution, enforcement intel, and advisories.

Architecture:
- /api/cached/* → Precomputed, cache-served endpoints (< 5ms, production path)
- /api/agents/* → Live multi-agent pipeline (for on-demand queries)
- /api/stations, /forecast, etc. → Direct endpoints (dev/legacy)
"""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

from routers import stations, forecast, attribution, enforcement, advisory, agents
from routers import cached, chat
from cache import get_cache
from scheduler import get_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: run initial precomputation. Shutdown: cleanup."""
    print("\n🚀 AERIS API starting...")
    print("   Running initial precomputation...")

    scheduler = get_scheduler()
    try:
        await scheduler.run_full_refresh()
    except Exception as e:
        print(f"   ⚠ Initial precomputation error: {e}")
        print("   API will start with empty cache (data served on-demand)")

    # Start background scheduler (every 6 hours)
    scheduler.start_background(interval_seconds=21600)

    yield  # App runs

    # Shutdown
    scheduler.stop()
    print("\n🛑 AERIS API shutting down...")


app = FastAPI(
    title="AERIS API",
    description="Urban AQI Intelligence Platform — Precomputed predictions, attribution & advisories",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Cached endpoints (production, fast) ──────────────────
app.include_router(cached.router, prefix="/api/v1", tags=["Cached (Production)"])

# ─── AI Chat (Gemini-powered) ─────────────────────────────
app.include_router(chat.router, prefix="/api/chat", tags=["AI Chat"])

# ─── Agent pipeline (live, on-demand) ─────────────────────
app.include_router(agents.router, prefix="/api/agents", tags=["Multi-Agent Pipeline"])

# ─── Direct endpoints (dev/legacy) ────────────────────────
app.include_router(stations.router, prefix="/api/stations", tags=["Stations"])
app.include_router(forecast.router, prefix="/api/forecast", tags=["Forecast"])
app.include_router(attribution.router, prefix="/api/attribution", tags=["Attribution"])
app.include_router(enforcement.router, prefix="/api/enforcement", tags=["Enforcement"])
app.include_router(advisory.router, prefix="/api/advisory", tags=["Advisory"])


@app.get("/")
async def root():
    cache = get_cache()
    stats = cache.stats
    return {
        "name": "AERIS API",
        "version": "0.2.0",
        "status": "running",
        "cache": {
            "entries": stats["size"],
            "hit_rate": f"{stats['hit_rate_pct']}%",
        },
        "endpoints": {
            "production": [
                "/api/v1/snapshot/{station_id}",
                "/api/v1/forecast/{station_id}",
                "/api/v1/attribution/{station_id}",
                "/api/v1/enforcement",
                "/api/v1/advisory?aqi=350&language=hi",
                "/api/v1/stats",
                "/api/v1/refresh",
            ],
            "agents": [
                "/api/agents/pipeline/{station_id}",
                "/api/agents/advisory/{station_id}",
                "/api/agents/enforcement/city",
                "/api/agents/status",
            ],
        },
    }


@app.get("/health")
async def health():
    cache = get_cache()
    return {
        "status": "healthy",
        "cache_size": cache.size,
        "cache_hit_rate": f"{cache.stats['hit_rate_pct']}%",
    }
