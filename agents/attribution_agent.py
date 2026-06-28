"""
Source Attribution Agent
Uses SHAP values from the trained model to attribute pollution to specific sources.
Sources identified via feature groups: road/traffic features, industrial proximity,
fire hotspots, weather patterns, construction activity.
"""

from typing import Dict


class SourceAttributionAgent:
    """Attributes PM2.5 levels to specific pollution sources using SHAP analysis."""

    # Feature groups mapped to pollution sources
    SOURCE_FEATURES = {
        "vehicular_traffic": [
            "road_density_500m", "highway_km_1km", "road_density_1km"
        ],
        "industrial": [
            "industrial_count_2km", "industrial_count_5km"
        ],
        "construction": [
            "construction_count_2km"
        ],
        "biomass_burning": [
            "fire_count", "fire_count_lag1", "fire_count_rolling7d",
            "fire_dispersion_index"
        ],
        "weather_driven": [
            "wind_speed", "temperature", "humidity", "inversion_proxy",
            "wind_stagnation_index", "calm_wind_indicator"
        ],
        "secondary_particles": [
            "no2", "o3", "no2_lag1", "o3_lag1"
        ],
    }

    def __init__(self, model=None, explainer=None):
        self.model = model
        self.explainer = explainer

    def attribute(self, features: dict) -> Dict[str, float]:
        """
        Given a feature vector, return source attribution percentages.
        Uses SHAP values grouped by source category.
        """
        if self.explainer is None:
            # Return mock attribution until model is trained
            return self._mock_attribution()

        # TODO: Implement real SHAP-based attribution
        # shap_values = self.explainer.shap_values(features)
        # Group SHAP values by source category
        # Normalize to percentages
        return self._mock_attribution()

    def _mock_attribution(self) -> Dict[str, float]:
        """Placeholder attribution for demo."""
        import random
        raw = {
            "vehicular_traffic": random.uniform(25, 45),
            "industrial": random.uniform(10, 25),
            "construction": random.uniform(5, 15),
            "biomass_burning": random.uniform(5, 20),
            "weather_driven": random.uniform(10, 25),
            "secondary_particles": random.uniform(5, 15),
        }
        total = sum(raw.values())
        return {k: round(v / total * 100, 1) for k, v in raw.items()}
