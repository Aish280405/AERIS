"""
Cached API endpoints — serves precomputed results from cache.
These are the production endpoints citizens and authority users hit.
Ultra-fast (< 5ms) because all computation happened in the background.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import datetime

from cache import get_cache, CacheTTL

router = APIRouter()


@router.get("/snapshot/{station_id}")
async def get_station_snapshot(station_id: str):
    """
    Get full station snapshot in ONE call.
    Returns: current AQI + forecast + attribution + advisory.
    This is the primary endpoint for the citizen dashboard.
    """
    cache = get_cache()
    snapshot = cache.get_namespaced("snapshot", station_id)

    if snapshot:
        return {
            **snapshot,
            "served_from": "cache",
            "latency_note": "< 5ms (precomputed)",
        }

    # Fallback: try to assemble from individual caches
    forecast = cache.get_namespaced("forecast", station_id)
    attribution = cache.get_namespaced("attribution", station_id)

    if forecast or attribution:
        return {
            "station_id": station_id,
            "forecast": forecast,
            "attribution": attribution,
            "advisory_summary": None,
            "served_from": "cache_partial",
            "note": "Snapshot not yet computed, serving partial data",
        }

    raise HTTPException(
        status_code=404,
        detail=f"No cached data for station {station_id}. Run precomputation first.",
    )


@router.get("/forecast/{station_id}")
async def get_cached_forecast(station_id: str):
    """Get cached forecast for a station."""
    cache = get_cache()
    result = cache.get_namespaced("forecast", station_id)
    if result:
        return {"data": result, "served_from": "cache"}
    raise HTTPException(status_code=404, detail="Forecast not in cache")


@router.get("/attribution/{station_id}")
async def get_cached_attribution(station_id: str):
    """Get cached attribution for a station."""
    cache = get_cache()
    result = cache.get_namespaced("attribution", station_id)
    if result:
        return {"data": result, "served_from": "cache"}
    raise HTTPException(status_code=404, detail="Attribution not in cache")


@router.get("/enforcement")
async def get_cached_enforcement():
    """Get cached city-wide enforcement recommendations."""
    cache = get_cache()
    result = cache.get("enforcement:city_recommendations")
    if result:
        return {
            "city": "Delhi",
            "recommendations": result,
            "count": len(result),
            "served_from": "cache",
        }
    raise HTTPException(status_code=404, detail="Enforcement data not in cache")


@router.get("/advisory")
async def get_cached_advisory(
    aqi: int = Query(..., ge=0, le=500, description="AQI value"),
    source: str = Query("vehicular_traffic", description="Dominant source"),
    language: str = Query("en", description="Language: en, hi"),
    trend: str = Query("stable", description="Trend: improving, stable, worsening"),
):
    """
    Get cached LLM advisory by AQI bucket.
    This is the magic: AQI 347 and 352 both hit the same cached advisory.
    """
    cache = get_cache()

    # Map AQI to bucket
    if aqi <= 50:
        bucket = "good"
    elif aqi <= 100:
        bucket = "satisfactory"
    elif aqi <= 200:
        bucket = "moderate"
    elif aqi <= 300:
        bucket = "poor"
    elif aqi <= 400:
        bucket = "very_poor"
    else:
        bucket = "severe"

    cache_key = f"advisory:{bucket}:{source}:{language}:{trend}"
    result = cache.get(cache_key)

    if result:
        return {
            **result,
            "served_from": "cache",
            "cache_key": cache_key,
            "aqi_bucket": bucket,
            "actual_aqi": aqi,
        }

    # Not in cache — generate on-the-fly (rare, only if precompute missed it)
    return {
        "aqi": aqi,
        "level": bucket,
        "advisory": f"AQI is {aqi} ({bucket}). Take appropriate precautions.",
        "served_from": "fallback",
        "note": "Advisory not precomputed for this combination",
    }


@router.get("/stats")
async def get_cache_stats():
    """Get cache statistics — useful for monitoring."""
    cache = get_cache()
    stats = cache.stats
    return {
        "cache": stats,
        "timestamp": datetime.now().isoformat(),
        "health": "healthy" if stats["hit_rate_pct"] > 80 else "degraded",
    }


@router.post("/refresh")
async def trigger_refresh():
    """
    Manually trigger a full precomputation refresh.
    Used by admin/authority users or monitoring systems.
    """
    from scheduler import get_scheduler

    scheduler = get_scheduler()
    result = await scheduler.run_full_refresh()
    return {
        "status": "completed",
        "result": result,
    }
