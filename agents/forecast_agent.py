"""
Forecast Agent
Predicts 1/2/3 day PM2.5 and AQI using trained XGBoost/LightGBM models.
Falls back to mock predictions when model files are not available.

Model files expected at:
  - models/xgb_1day.joblib
  - models/xgb_2day.joblib
  - models/xgb_3day.joblib
"""

import os
from typing import Dict, List, Optional
from pathlib import Path

MODEL_DIR = Path(__file__).parent.parent / "models"


class ForecastAgent:
    """Predicts AQI using trained ML models."""

    def __init__(self):
        self.models = {}
        self.model_status = "mock"
        self._load_models()

    def _load_models(self):
        """Attempt to load trained model files."""
        try:
            import joblib

            for days in [1, 2, 3]:
                for prefix in ["xgb", "lgbm", "model"]:
                    path = MODEL_DIR / f"{prefix}_{days}day.joblib"
                    if path.exists():
                        self.models[days] = joblib.load(path)
                        self.model_status = "trained"

            if self.models:
                print(f"✓ ForecastAgent: Loaded {len(self.models)} model(s)")
            else:
                print("⚠ ForecastAgent: No model files found, using mock predictions")
        except ImportError:
            print("⚠ ForecastAgent: joblib not installed, using mock predictions")
        except Exception as e:
            print(f"⚠ ForecastAgent: Error loading models: {e}")

    def predict(
        self,
        station_id: str,
        days: int = 3,
        features: Optional[Dict] = None,
    ) -> Dict:
        """
        Predict PM2.5 for next N days.
        
        If trained model is available, uses it.
        Otherwise returns deterministic mock predictions.
        """
        if self.models and features:
            return self._predict_with_model(station_id, days, features)
        return self._mock_predict(station_id, days)

    def _predict_with_model(
        self, station_id: str, days: int, features: Dict
    ) -> Dict:
        """Run actual model inference."""
        import numpy as np

        predictions = []
        for d in range(1, days + 1):
            model = self.models.get(d)
            if model is None:
                # Fall back to day-1 model if specific day model missing
                model = self.models.get(1)
            if model is None:
                continue

            # Prepare feature vector (model expects specific column order)
            # This will be aligned with the actual training feature set
            feature_values = np.array([list(features.values())])
            pm25_pred = float(model.predict(feature_values)[0])
            aqi_pred = self._pm25_to_aqi(pm25_pred)

            predictions.append({
                "day_ahead": d,
                "predicted_pm25": round(pm25_pred, 1),
                "predicted_aqi": aqi_pred,
                "model_used": "xgboost",
            })

        return {
            "station_id": station_id,
            "model_status": "trained",
            "predictions": predictions,
        }

    def _mock_predict(self, station_id: str, days: int) -> Dict:
        """Deterministic mock predictions based on station_id hash."""
        # Use station_id hash for reproducible results
        hash_val = sum(ord(c) for c in station_id)
        base_pm25 = 80 + (hash_val % 150)

        predictions = []
        for d in range(1, days + 1):
            pm25 = base_pm25 + (d * 8) + ((hash_val * d) % 30) - 15
            pm25 = max(20, pm25)
            aqi = self._pm25_to_aqi(pm25)
            predictions.append({
                "day_ahead": d,
                "predicted_pm25": round(pm25, 1),
                "predicted_aqi": aqi,
                "confidence_lower": round(pm25 * 0.75, 1),
                "confidence_upper": round(pm25 * 1.25, 1),
                "model_used": "mock",
            })

        return {
            "station_id": station_id,
            "model_status": "mock",
            "baseline_rmse": 83.38,
            "predictions": predictions,
        }

    def _pm25_to_aqi(self, pm25: float) -> int:
        """Convert PM2.5 (µg/m³) to AQI using Indian NAQI breakpoints."""
        breakpoints = [
            (0, 30, 0, 50),
            (31, 60, 51, 100),
            (61, 90, 101, 200),
            (91, 120, 201, 300),
            (121, 250, 301, 400),
            (250, 500, 401, 500),
        ]
        for bp_lo, bp_hi, aqi_lo, aqi_hi in breakpoints:
            if bp_lo <= pm25 <= bp_hi:
                aqi = ((aqi_hi - aqi_lo) / (bp_hi - bp_lo)) * (pm25 - bp_lo) + aqi_lo
                return int(round(aqi))
        return 500 if pm25 > 500 else 0
