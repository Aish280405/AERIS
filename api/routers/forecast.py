"""Forecast endpoints — serves 1/2/3 day PM2.5 predictions."""

from fastapi import APIRouter, Query
from typing import Optional
import random
from datetime import datetime, timedelta

router = APIRouter()


# TODO: Load actual trained model
# from joblib import load
# model_1d = load("../models/xgb_1day.joblib")


def mock_forecast(station_id: str, days: int = 3):
    """Generate mock forecast until model is trained."""
    base_aqi = random.randint(80, 300)
    forecasts = []
    for d in range(1, days + 1):
        predicted = base_aqi + random.uniform(-30, 30) * d
        predicted = max(10, predicted)
        date = (datetime.now() + timedelta(days=d)).strftime("%Y-%m-%d")
        forecasts.append({
            "date": date,
            "day_ahead": d,
            "predicted_pm25": round(predicted, 1),
            "predicted_aqi": int(predicted * 1.5),
            "confidence_lower": round(predicted * 0.7, 1),
            "confidence_upper": round(predicted * 1.3, 1),
        })
    return forecasts


@router.get("/{station_id}")
async def get_forecast(
    station_id: str,
    days: int = Query(3, ge=1, le=3, description="Number of days ahead (1-3)"),
):
    """Get PM2.5 forecast for a station."""
    forecasts = mock_forecast(station_id, days)
    return {
        "station_id": station_id,
        "model": "mock",  # Will be "xgboost" or "lightgbm" after training
        "baseline_rmse": 83.38,
        "forecasts": forecasts,
    }


@router.get("/zone/{zone_id}")
async def get_zone_forecast(zone_id: str):
    """Get forecast for a ~5km grid zone."""
    # TODO: Implement zone-level aggregation
    return {
        "zone_id": zone_id,
        "message": "Zone forecasts coming soon — requires model training",
    }
