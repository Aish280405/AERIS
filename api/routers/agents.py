"""
Agent pipeline endpoints — exposes the multi-agent orchestrator via HTTP.
"""

import sys
from pathlib import Path
from fastapi import APIRouter, Query
from typing import Optional

# Add project root to path for agent imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from agents.orchestrator import AERISOrchestrator
from agents.forecast_agent import ForecastAgent
from agents.attribution_agent import SourceAttributionAgent
from agents.enforcement_agent import EnforcementAgent
from agents.advisory_agent import AdvisoryAgent

router = APIRouter()

# Initialize agents once at startup
orchestrator = AERISOrchestrator(
    forecast_agent=ForecastAgent(),
    attribution_agent=SourceAttributionAgent(),
    enforcement_agent=EnforcementAgent(),
    advisory_agent=AdvisoryAgent(),
)


@router.get("/pipeline/{station_id}")
async def run_pipeline(
    station_id: str,
    language: str = Query("en", description="Language: en, hi"),
    days: int = Query(3, ge=1, le=3),
):
    """
    Run full multi-agent pipeline for a station.
    Returns: forecast + attribution + enforcement + advisory
    """
    result = await orchestrator.run_full_pipeline(
        station_id=station_id,
        language=language,
        days=days,
    )
    return result.to_dict()


@router.get("/advisory/{station_id}")
async def get_advisory(
    station_id: str,
    aqi: int = Query(..., description="Current AQI value"),
    language: str = Query("en", description="Language: en, hi"),
):
    """Generate LLM-powered health advisory for a station."""
    result = await orchestrator.run_advisory_only(
        station_id=station_id,
        aqi=aqi,
        language=language,
    )
    return result


@router.get("/enforcement/city")
async def get_city_enforcement():
    """
    Run enforcement pipeline across all Delhi stations.
    Returns top 5 prioritized recommendations.
    """
    import json

    stations_file = Path(__file__).parent.parent.parent / "data" / "stations.json"
    with open(stations_file) as f:
        stations = json.load(f)

    recommendations = await orchestrator.run_enforcement_pipeline(stations[:20])
    return {
        "city": "Delhi",
        "total_recommendations": len(recommendations),
        "recommendations": recommendations,
    }


@router.get("/status")
async def agent_status():
    """Check status of all agents."""
    return {
        "orchestrator": "active",
        "agents": {
            "forecast": {
                "status": orchestrator.forecast_agent.model_status,
                "description": "Predicts 1-3 day AQI using XGBoost/LightGBM",
            },
            "attribution": {
                "status": orchestrator.attribution_agent.status,
                "description": "SHAP-based source attribution",
            },
            "enforcement": {
                "status": "active",
                "description": "Prioritized enforcement recommendations",
            },
            "advisory": {
                "status": orchestrator.advisory_agent.status,
                "description": "LLM-generated health advisories (Gemini)",
            },
        },
        "pipeline": "forecast → attribution → enforcement → advisory",
    }
