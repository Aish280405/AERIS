"""
Enforcement Intelligence Agent
Prioritizes areas for inspector deployment based on:
- Predicted AQI levels (from forecast model)
- Source attribution (which sources are actionable)
- Historical enforcement effectiveness
- Geographic clustering of violations
"""

from typing import List, Dict
from dataclasses import dataclass


@dataclass
class EnforcementRecommendation:
    rank: int
    area: str
    lat: float
    lon: float
    predicted_aqi: float
    primary_source: str
    recommended_action: str
    urgency: str  # critical, high, medium
    evidence: str
    estimated_impact: str


class EnforcementAgent:
    """Generates prioritized enforcement deployment recommendations."""

    # Actionable sources (weather-driven is not actionable)
    ACTIONABLE_SOURCES = {
        "vehicular_traffic": [
            "Deploy traffic police for diversion",
            "Set up odd-even enforcement",
            "Check commercial vehicle compliance",
        ],
        "industrial": [
            "Inspect industrial unit emissions",
            "Check DG set usage compliance",
            "Verify pollution control equipment",
        ],
        "construction": [
            "Inspect dust suppression measures",
            "Check site boundary compliance",
            "Verify water sprinkling systems",
        ],
        "biomass_burning": [
            "Deploy patrol for open burning",
            "Check crop residue burning",
            "Monitor waste burning hotspots",
        ],
    }

    def __init__(self, forecast_model=None, attribution_agent=None):
        self.forecast_model = forecast_model
        self.attribution_agent = attribution_agent

    def generate_recommendations(
        self, stations: List[Dict], top_n: int = 5
    ) -> List[EnforcementRecommendation]:
        """
        Generate ranked enforcement recommendations.
        Priority = f(predicted_aqi, source_actionability, area_population)
        """
        # TODO: Use real model predictions
        # For now, return demo recommendations
        return self._demo_recommendations(top_n)

    def _demo_recommendations(self, n: int) -> List[EnforcementRecommendation]:
        """Demo recommendations for hackathon presentation."""
        import random

        hotspots = [
            ("Anand Vihar", 28.6469, 77.3164),
            ("Wazirpur", 28.6969, 77.1547),
            ("Jahangirpuri", 28.7256, 77.1723),
            ("Rohini", 28.7326, 77.1101),
            ("Dwarka Sector 8", 28.5823, 77.0500),
            ("Mundka", 28.6840, 77.0310),
        ]

        recommendations = []
        for i, (area, lat, lon) in enumerate(hotspots[:n]):
            source = random.choice(list(self.ACTIONABLE_SOURCES.keys()))
            action = random.choice(self.ACTIONABLE_SOURCES[source])
            aqi = random.randint(280, 500)
            urgency = "critical" if aqi > 400 else "high" if aqi > 300 else "medium"

            recommendations.append(
                EnforcementRecommendation(
                    rank=i + 1,
                    area=area,
                    lat=lat,
                    lon=lon,
                    predicted_aqi=aqi,
                    primary_source=source,
                    recommended_action=action,
                    urgency=urgency,
                    evidence=f"Forecast: {aqi} AQI in 24h, {source} at {random.randint(25, 50)}%",
                    estimated_impact=f"Potential {random.randint(10, 30)}% reduction if acted in 6h",
                )
            )

        return recommendations
