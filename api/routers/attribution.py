"""Source Attribution endpoints — identifies pollution sources at a location."""

from fastapi import APIRouter, Query
from typing import Optional
import random

router = APIRouter()


def mock_attribution(station_id: str):
    """Mock source attribution until SHAP analysis is complete."""
    # These will come from SHAP values on the trained model
    sources = {
        "vehicular_traffic": round(random.uniform(25, 45), 1),
        "industrial": round(random.uniform(10, 25), 1),
        "construction_dust": round(random.uniform(5, 15), 1),
        "biomass_burning": round(random.uniform(5, 20), 1),
        "weather_driven": round(random.uniform(10, 25), 1),
        "secondary_particles": round(random.uniform(5, 15), 1),
    }
    # Normalize to 100%
    total = sum(sources.values())
    sources = {k: round(v / total * 100, 1) for k, v in sources.items()}
    return sources


@router.get("/{station_id}")
async def get_attribution(station_id: str):
    """Get pollution source attribution for a station."""
    sources = mock_attribution(station_id)
    return {
        "station_id": station_id,
        "method": "mock",  # Will be "shap" after model training
        "sources": sources,
        "dominant_source": max(sources, key=sources.get),
        "confidence": "medium",
        "note": "Attribution based on SHAP feature importance (pending model training)",
    }


@router.get("/area")
async def get_area_attribution(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius_km: float = Query(2.0, description="Radius in km"),
):
    """Get source attribution for a geographic area."""
    sources = mock_attribution("area")
    return {
        "location": {"lat": lat, "lon": lon, "radius_km": radius_km},
        "sources": sources,
        "nearby_stations": [],  # TODO: find stations within radius
    }
