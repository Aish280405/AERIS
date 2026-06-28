"""
AERIS Multi-Agent Orchestrator
Coordinates the pipeline: Forecast → Attribution → Enforcement → Advisory

The orchestrator chains agents so each downstream agent consumes outputs from upstream:
  1. ForecastAgent: predicts 1/2/3 day AQI for a station
  2. AttributionAgent: explains WHY (source breakdown via SHAP)
  3. EnforcementAgent: recommends WHERE to act (prioritized by forecast + attribution)
  4. AdvisoryAgent: generates WHAT to tell citizens (LLM-powered, multi-language)
"""

from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
import json

from agents.forecast_agent import ForecastAgent
from agents.attribution_agent import SourceAttributionAgent
from agents.enforcement_agent import EnforcementAgent
from agents.advisory_agent import AdvisoryAgent


@dataclass
class OrchestratorResult:
    """Full intelligence output for a station or area."""
    station_id: str
    forecast: Dict
    attribution: Dict
    enforcement: List[Dict]
    advisory: Dict
    metadata: Dict

    def to_dict(self):
        return asdict(self)

    def to_json(self):
        return json.dumps(self.to_dict(), indent=2, ensure_ascii=False)


class AERISOrchestrator:
    """
    Multi-agent orchestrator that chains:
    Forecast → Attribution → Enforcement → Advisory
    
    Each agent receives context from prior agents, enabling
    evidence-based downstream reasoning.
    """

    def __init__(
        self,
        forecast_agent: Optional[ForecastAgent] = None,
        attribution_agent: Optional[SourceAttributionAgent] = None,
        enforcement_agent: Optional[EnforcementAgent] = None,
        advisory_agent: Optional[AdvisoryAgent] = None,
    ):
        self.forecast_agent = forecast_agent or ForecastAgent()
        self.attribution_agent = attribution_agent or SourceAttributionAgent()
        self.enforcement_agent = enforcement_agent or EnforcementAgent()
        self.advisory_agent = advisory_agent or AdvisoryAgent()

    async def run_full_pipeline(
        self,
        station_id: str,
        features: Optional[Dict] = None,
        language: str = "en",
        days: int = 3,
    ) -> OrchestratorResult:
        """
        Run the full multi-agent pipeline for a station.
        
        Flow:
        1. Forecast Agent → predicts AQI for next N days
        2. Attribution Agent → explains sources of current pollution
        3. Enforcement Agent → uses forecast + attribution to prioritize actions
        4. Advisory Agent → generates citizen advisory using all context
        """

        # ─── Agent 1: Forecast ───────────────────────────────
        forecast = self.forecast_agent.predict(station_id, days=days, features=features)

        # ─── Agent 2: Attribution ────────────────────────────
        attribution = self.attribution_agent.attribute(features or {})

        # ─── Agent 3: Enforcement ────────────────────────────
        # Enforcement agent receives forecast + attribution as context
        enforcement_context = {
            "station_id": station_id,
            "predicted_aqi_day1": forecast["predictions"][0]["predicted_aqi"] if forecast["predictions"] else None,
            "dominant_source": max(attribution.items(), key=lambda x: x[1])[0] if attribution else None,
            "attribution": attribution,
        }
        enforcement = self.enforcement_agent.generate_recommendations_with_context(
            enforcement_context
        )

        # ─── Agent 4: Advisory ───────────────────────────────
        # Advisory agent receives ALL prior context
        advisory_context = {
            "station_id": station_id,
            "current_aqi": forecast["predictions"][0]["predicted_aqi"] if forecast["predictions"] else 200,
            "forecast_trend": self._determine_trend(forecast),
            "dominant_source": enforcement_context["dominant_source"],
            "attribution": attribution,
            "language": language,
        }
        advisory = await self.advisory_agent.generate_advisory_with_context(
            advisory_context
        )

        return OrchestratorResult(
            station_id=station_id,
            forecast=forecast,
            attribution=attribution,
            enforcement=enforcement,
            advisory=advisory,
            metadata={
                "pipeline": "forecast → attribution → enforcement → advisory",
                "agents_used": 4,
                "language": language,
                "model_status": self.forecast_agent.model_status,
            },
        )

    async def run_advisory_only(
        self,
        station_id: str,
        aqi: int,
        language: str = "en",
    ) -> Dict:
        """Quick path: just generate advisory for known AQI."""
        from agents.forecast_agent import ForecastAgent
        
        attribution = self.attribution_agent.attribute({})
        dominant = max(attribution.items(), key=lambda x: x[1])[0]
        
        context = {
            "station_id": station_id,
            "current_aqi": aqi,
            "forecast_trend": "stable",
            "dominant_source": dominant,
            "attribution": attribution,
            "language": language,
        }
        return await self.advisory_agent.generate_advisory_with_context(context)

    async def run_enforcement_pipeline(
        self,
        stations: List[Dict],
    ) -> List[Dict]:
        """
        Run forecast + attribution for multiple stations,
        then generate city-wide enforcement priorities.
        """
        all_contexts = []
        for station in stations:
            sid = station["station_id"]
            forecast = self.forecast_agent.predict(sid, days=1)
            attribution = self.attribution_agent.attribute({})
            
            all_contexts.append({
                "station_id": sid,
                "station_name": station.get("station_name", sid),
                "lat": station.get("lat"),
                "lon": station.get("lon"),
                "predicted_aqi": forecast["predictions"][0]["predicted_aqi"] if forecast["predictions"] else 200,
                "dominant_source": max(attribution.items(), key=lambda x: x[1])[0],
                "attribution": attribution,
            })

        return self.enforcement_agent.generate_city_recommendations(all_contexts)

    def _determine_trend(self, forecast: Dict) -> str:
        """Determine if AQI trend is improving, stable, or worsening."""
        preds = forecast.get("predictions", [])
        if len(preds) < 2:
            return "stable"
        first = preds[0]["predicted_aqi"]
        last = preds[-1]["predicted_aqi"]
        diff = last - first
        if diff > 30:
            return "worsening"
        elif diff < -30:
            return "improving"
        return "stable"
