"""Station data endpoints — serves station metadata and current AQI readings."""

import json
from pathlib import Path
from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent.parent / "data"


def load_stations():
    """Load station data from static JSON."""
    stations_file = DATA_DIR / "stations.json"
    if stations_file.exists():
        with open(stations_file) as f:
            return json.load(f)
    return []


@router.get("/")
async def get_stations(city: Optional[str] = Query(None, description="Filter by city")):
    """Get all monitoring stations with metadata."""
    stations = load_stations()
    if city:
        stations = [s for s in stations if s.get("city", "").lower() == city.lower()]
    return {"stations": stations, "count": len(stations)}


@router.get("/{station_id}")
async def get_station(station_id: str):
    """Get a specific station by ID."""
    stations = load_stations()
    station = next((s for s in stations if s["station_id"] == station_id), None)
    if not station:
        return {"error": "Station not found"}
    return station


@router.get("/{station_id}/current")
async def get_current_aqi(station_id: str):
    """Get current AQI reading for a station (mock for now)."""
    import random

    # TODO: Replace with real-time data fetch
    aqi = random.randint(50, 400)
    category = (
        "Good" if aqi <= 50
        else "Satisfactory" if aqi <= 100
        else "Moderate" if aqi <= 200
        else "Poor" if aqi <= 300
        else "Very Poor" if aqi <= 400
        else "Severe"
    )
    return {
        "station_id": station_id,
        "aqi": aqi,
        "pm25": round(aqi * 0.6 + random.uniform(-10, 10), 1),
        "pm10": round(aqi * 1.2 + random.uniform(-20, 20), 1),
        "category": category,
        "timestamp": "2024-01-15T10:00:00Z",
    }
