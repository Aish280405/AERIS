"""Station data endpoints — serves station metadata dynamically from the ML dataset."""

import json
import pandas as pd
from pathlib import Path
from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent.parent / "data"
_stations_cache = None


def load_stations():
    """
    Load station data. Priority:
    1. data/stations.json (pre-built with OpenAQ names)
    2. Auto-generate from ml_dataset_cleaned.csv
    """
    global _stations_cache
    if _stations_cache is not None:
        return _stations_cache

    stations_file = DATA_DIR / "stations.json"
    if stations_file.exists():
        with open(stations_file) as f:
            _stations_cache = json.load(f)
        return _stations_cache

    # Fallback: generate from dataset
    csv_path = DATA_DIR / "ml_dataset_cleaned.csv"
    if csv_path.exists():
        df = pd.read_csv(csv_path)
        stations_df = df.groupby("station_id").agg(
            {"city": "first", "lat": "first", "lon": "first"}
        ).reset_index()

        result = []
        for _, row in stations_df.iterrows():
            sid = int(row["station_id"])
            result.append({
                "station_id": str(sid),
                "station_name": f"Station {sid}",
                "city": row["city"],
                "lat": round(float(row["lat"]), 6),
                "lon": round(float(row["lon"]), 6),
                "pollutants": ["PM2.5", "PM10", "NO2"],
            })

        _stations_cache = result
        return _stations_cache

    return []


def invalidate_stations_cache():
    """Call this when the dataset changes to reload stations."""
    global _stations_cache
    _stations_cache = None


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
