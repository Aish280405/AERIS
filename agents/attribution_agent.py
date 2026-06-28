"""
Source Attribution Agent
Uses SHAP values from the trained model to attribute pollution to specific sources.

Feature groups → source mapping:
  - Road density, highway km → Vehicular Traffic
  - Industrial count → Industrial Emissions
  - Construction count → Construction Dust
  - Fire count, fire rolling → Biomass Burning
  - Wind, temperature, humidity, inversion → Weather-driven
  - NO2, O3 → Secondary Particle Formation

When no SHAP explainer is available, uses deterministic mock attribution
based on station characteristics.
"""

from typing import Dict, Optional
from pathlib import Path

MODEL_DIR = Path(__file__).parent.parent / "models"

# Feature groups that map to each pollution source
SOURCE_FEATURE_GROUPS = {
    "vehicular_traffic": [
        "road_density_500m", "highway_km_1km", "road_density_1km",
    ],
    "industrial": [
        "industrial_count_2km", "industrial_count_5km",
    ],
    "construction": [
        "construction_count_2km",
    ],
    "biomass_burning": [
        "fire_count", "fire_count_lag1", "fire_count_rolling7d",
        "fire_dispersion_index",
    ],
    "weather_driven": [
        "wind_speed", "temperature_2m", "relative_humidity_2m",
        "inversion_proxy", "wind_stagnation_index", "calm_wind_indicator",
    ],
    "secondary_particles": [
        "no2", "o3", "no2_lag1", "o3_lag1",
    ],
}


class SourceAttributionAgent:
    """Attributes PM2.5 levels to pollution sources using SHAP analysis."""

    def __init__(self, explainer=None):
        self.explainer = explainer
        self.status = "mock"
        self._load_explainer()

    def _load_explainer(self):
        """Try to load a pre-computed SHAP explainer."""
        try:
            import joblib

            explainer_path = MODEL_DIR / "shap_explainer.joblib"
            if explainer_path.exists():
                self.explainer = joblib.load(explainer_path)
                self.status = "shap"
                print("✓ AttributionAgent: SHAP explainer loaded")
            else:
                print("⚠ AttributionAgent: No SHAP explainer, using feature-group heuristic")
        except Exception:
            pass

    def attribute(self, features: Dict) -> Dict[str, float]:
        """
        Return source attribution as percentage breakdown.
        
        If SHAP explainer available → real attribution
        If features available but no SHAP → heuristic from feature values
        Otherwise → deterministic mock
        """
        if self.explainer and features:
            return self._shap_attribution(features)
        if features:
            return self._heuristic_attribution(features)
        return self._mock_attribution(features)

    def _shap_attribution(self, features: Dict) -> Dict[str, float]:
        """Real SHAP-based attribution."""
        import numpy as np

        feature_values = np.array([list(features.values())])
        shap_values = self.explainer.shap_values(feature_values)[0]

        # Get feature names from the features dict
        feature_names = list(features.keys())

        # Group SHAP values by source category
        source_importance = {}
        for source, source_features in SOURCE_FEATURE_GROUPS.items():
            total = 0.0
            for i, fname in enumerate(feature_names):
                if fname in source_features:
                    total += abs(shap_values[i])
            source_importance[source] = total

        # Normalize to percentages
        grand_total = sum(source_importance.values())
        if grand_total == 0:
            return self._mock_attribution(features)

        return {k: round(v / grand_total * 100, 1) for k, v in source_importance.items()}

    def _heuristic_attribution(self, features: Dict) -> Dict[str, float]:
        """
        When features are available but no SHAP explainer,
        use feature magnitudes as a rough proxy for attribution.
        """
        source_scores = {}
        for source, source_features in SOURCE_FEATURE_GROUPS.items():
            score = 0.0
            for fname in source_features:
                val = features.get(fname, 0)
                if isinstance(val, (int, float)):
                    score += abs(val)
            source_scores[source] = max(score, 0.01)  # avoid zero

        total = sum(source_scores.values())
        return {k: round(v / total * 100, 1) for k, v in source_scores.items()}

    def _mock_attribution(self, features: Dict) -> Dict[str, float]:
        """Deterministic mock attribution."""
        # Use a simple seed from features or default
        seed = sum(ord(c) for c in str(features)[:20]) if features else 42

        raw = {
            "vehicular_traffic": 25 + (seed % 20),
            "industrial": 12 + (seed % 13),
            "construction": 6 + (seed % 9),
            "biomass_burning": 8 + ((seed >> 1) % 14),
            "weather_driven": 15 + ((seed >> 2) % 12),
            "secondary_particles": 5 + ((seed >> 3) % 8),
        }
        total = sum(raw.values())
        return {k: round(v / total * 100, 1) for k, v in raw.items()}

    def get_dominant_source(self, attribution: Dict[str, float]) -> str:
        """Return the dominant pollution source."""
        return max(attribution.items(), key=lambda x: x[1])[0]

    def get_actionable_sources(self, attribution: Dict[str, float]) -> Dict[str, float]:
        """Return only actionable sources (exclude weather-driven)."""
        actionable = {k: v for k, v in attribution.items() if k != "weather_driven"}
        total = sum(actionable.values())
        return {k: round(v / total * 100, 1) for k, v in actionable.items()}
