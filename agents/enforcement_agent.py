"""
Enforcement Intelligence Agent
Consumes outputs from Forecast + Attribution agents to generate
prioritized, evidence-backed enforcement recommendations.

Priority scoring:
  score = (predicted_aqi × 0.4) + (actionable_source_pct × 0.3) + (population_density × 0.3)
  
Only actionable sources generate enforcement actions:
  - vehicular_traffic → traffic police, odd-even, diversion
  - industrial → emission inspections, DG set compliance
  - construction → dust suppression, site compliance
  - biomass_burning → patrol, burning hotspot monitoring
"""

from typing import Dict, List, Optional
from dataclasses import dataclass, asdict


# Action templates per source
ACTION_TEMPLATES = {
    "vehicular_traffic": [
        "Deploy traffic police for commercial vehicle enforcement",
        "Activate odd-even restrictions in this zone",
        "Set up vehicle emission testing checkpoint",
        "Divert heavy vehicles to bypass route",
    ],
    "industrial": [
        "Inspect industrial units for emission compliance",
        "Check DG set usage and fuel quality compliance",
        "Verify pollution control equipment operation",
        "Issue show-cause to non-compliant units",
    ],
    "construction": [
        "Inspect construction sites for dust suppression",
        "Verify site boundary wall and covering compliance",
        "Check water sprinkling systems operation",
        "Halt non-compliant construction activity",
    ],
    "biomass_burning": [
        "Deploy patrol for open burning detection",
        "Monitor crop residue burning in peripheral areas",
        "Inspect waste burning hotspots flagged by satellite",
        "Issue penalties for detected open burning",
    ],
}


@dataclass
class EnforcementRecommendation:
    rank: int
    station_id: str
    area: str
    lat: Optional[float]
    lon: Optional[float]
    predicted_aqi: int
    urgency: str  # critical, high, medium
    primary_source: str
    source_contribution: float
    recommended_action: str
    evidence: str
    estimated_impact: str

    def to_dict(self):
        return asdict(self)


class EnforcementAgent:
    """Generates prioritized enforcement deployment recommendations."""

    def __init__(self):
        pass

    def generate_recommendations_with_context(
        self, context: Dict
    ) -> List[Dict]:
        """
        Generate recommendations for a single station using
        upstream agent outputs (forecast + attribution).
        """
        attribution = context.get("attribution", {})
        predicted_aqi = context.get("predicted_aqi_day1", 200)
        station_id = context.get("station_id", "unknown")

        # Filter to actionable sources only
        actionable = {
            k: v for k, v in attribution.items()
            if k in ACTION_TEMPLATES
        }

        if not actionable:
            return []

        recommendations = []
        for i, (source, pct) in enumerate(
            sorted(actionable.items(), key=lambda x: x[1], reverse=True)[:3]
        ):
            actions = ACTION_TEMPLATES.get(source, [])
            action = actions[i % len(actions)] if actions else "Investigate source"

            urgency = self._calc_urgency(predicted_aqi, pct)

            recommendations.append({
                "rank": i + 1,
                "station_id": station_id,
                "primary_source": source,
                "source_contribution": pct,
                "predicted_aqi": predicted_aqi,
                "urgency": urgency,
                "recommended_action": action,
                "evidence": f"Forecast AQI: {predicted_aqi}, {source} at {pct}% contribution",
                "estimated_impact": self._estimate_impact(source, pct),
            })

        return recommendations

    def generate_city_recommendations(
        self, station_contexts: List[Dict], top_n: int = 5
    ) -> List[Dict]:
        """
        Generate city-wide enforcement priorities across all stations.
        Ranks by: predicted_aqi × actionable_source_percentage
        """
        scored = []
        for ctx in station_contexts:
            aqi = ctx.get("predicted_aqi", 200)
            attribution = ctx.get("attribution", {})
            
            # Calculate actionable percentage (exclude weather)
            actionable_pct = sum(
                v for k, v in attribution.items() if k in ACTION_TEMPLATES
            )
            
            # Priority score
            score = aqi * 0.6 + actionable_pct * 2.0
            
            dominant = ctx.get("dominant_source", "vehicular_traffic")
            dominant_pct = attribution.get(dominant, 30)
            
            actions = ACTION_TEMPLATES.get(dominant, ["Investigate"])
            action = actions[0]

            scored.append({
                "station_id": ctx["station_id"],
                "area": ctx.get("station_name", ctx["station_id"]),
                "lat": ctx.get("lat"),
                "lon": ctx.get("lon"),
                "predicted_aqi": aqi,
                "primary_source": dominant,
                "source_contribution": dominant_pct,
                "priority_score": round(score, 1),
                "urgency": self._calc_urgency(aqi, dominant_pct),
                "recommended_action": action,
                "evidence": f"Forecast AQI {aqi}, {dominant} contributing {dominant_pct}%",
                "estimated_impact": self._estimate_impact(dominant, dominant_pct),
            })

        # Sort by priority score descending
        scored.sort(key=lambda x: x["priority_score"], reverse=True)

        # Assign ranks
        for i, rec in enumerate(scored[:top_n]):
            rec["rank"] = i + 1

        return scored[:top_n]

    def _calc_urgency(self, aqi: int, source_pct: float) -> str:
        """Determine urgency level."""
        if aqi > 400 or (aqi > 300 and source_pct > 30):
            return "critical"
        if aqi > 250 or source_pct > 25:
            return "high"
        return "medium"

    def _estimate_impact(self, source: str, pct: float) -> str:
        """Estimate potential AQI reduction if action is taken."""
        # Rough estimate: can address ~40-60% of an actionable source
        reduction_factor = 0.5
        potential_reduction = round(pct * reduction_factor * 0.6, 0)  # 60% of AQI comes from PM2.5
        return f"Potential {int(potential_reduction)}% AQI reduction if acted within 6 hours"
