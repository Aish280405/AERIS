"""
AERIS Precomputation Scheduler

Runs the agent pipeline on a schedule, writing results to cache.
User requests become cache reads instead of live computation.

Schedules:
- Every 1 hour: ingest latest AQI data
- Every 6 hours: run forecasts, attribution, enforcement for all stations
- LLM advisories: precompute for all AQI buckets on startup + refresh every 2 hours
"""

import sys
import json
import time
import asyncio
import threading
from pathlib import Path
from typing import List, Dict
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from cache import get_cache, CacheTTL
from agents.forecast_agent import ForecastAgent
from agents.attribution_agent import SourceAttributionAgent
from agents.enforcement_agent import EnforcementAgent
from agents.advisory_agent import AdvisoryAgent


class PrecomputeScheduler:
    """
    Scheduled precomputation engine.
    Runs agent pipeline periodically and populates the cache.
    """

    def __init__(self):
        self.cache = get_cache()
        self.forecast_agent = ForecastAgent()
        self.attribution_agent = SourceAttributionAgent()
        self.enforcement_agent = EnforcementAgent()
        self.advisory_agent = AdvisoryAgent()
        self.stations = self._load_stations()
        self._running = False
        self._thread = None

    def _load_stations(self) -> List[Dict]:
        """Load station data."""
        stations_file = Path(__file__).parent.parent / "data" / "stations.json"
        if stations_file.exists():
            with open(stations_file) as f:
                return json.load(f)
        return []

    # ─── Precomputation Tasks ─────────────────────────────

    def precompute_forecasts(self) -> int:
        """Run forecast for all stations, write to cache."""
        count = 0
        for station in self.stations:
            sid = station["station_id"]
            try:
                result = self.forecast_agent.predict(sid, days=3)
                self.cache.set_namespaced("forecast", sid, result, CacheTTL.FORECAST)
                count += 1
            except Exception as e:
                print(f"  ⚠ Forecast failed for {sid}: {e}")
        return count

    def precompute_attribution(self) -> int:
        """Run attribution for all stations, write to cache."""
        count = 0
        for station in self.stations:
            sid = station["station_id"]
            try:
                result = self.attribution_agent.attribute({})
                self.cache.set_namespaced("attribution", sid, result, CacheTTL.ATTRIBUTION)
                count += 1
            except Exception as e:
                print(f"  ⚠ Attribution failed for {sid}: {e}")
        return count

    def precompute_enforcement(self) -> List[Dict]:
        """Run city-wide enforcement ranking, write to cache."""
        contexts = []
        for station in self.stations:
            sid = station["station_id"]
            forecast = self.cache.get_namespaced("forecast", sid)
            attribution = self.cache.get_namespaced("attribution", sid)

            if not forecast or not attribution:
                continue

            predicted_aqi = 200
            if forecast.get("predictions"):
                predicted_aqi = forecast["predictions"][0].get("predicted_aqi", 200)

            contexts.append({
                "station_id": sid,
                "station_name": station.get("station_name", sid),
                "lat": station.get("lat"),
                "lon": station.get("lon"),
                "predicted_aqi": predicted_aqi,
                "dominant_source": max(attribution.items(), key=lambda x: x[1])[0],
                "attribution": attribution,
            })

        recommendations = self.enforcement_agent.generate_city_recommendations(
            contexts, top_n=10
        )
        self.cache.set("enforcement:city_recommendations", recommendations, CacheTTL.ENFORCEMENT)
        return recommendations

    async def precompute_advisories(self) -> int:
        """
        Precompute LLM advisories for all AQI bucket × source × language combinations.
        This is the key optimization: ~30-60 unique combinations instead of per-user calls.
        """
        aqi_buckets = [
            ("good", 40),
            ("satisfactory", 75),
            ("moderate", 150),
            ("poor", 250),
            ("very_poor", 350),
            ("severe", 450),
        ]
        sources = ["vehicular_traffic", "industrial", "biomass_burning", "construction", "weather_driven"]
        languages = ["en", "hi"]
        trends = ["improving", "stable", "worsening"]

        count = 0
        for bucket_name, representative_aqi in aqi_buckets:
            for source in sources:
                for lang in languages:
                    for trend in trends:
                        cache_key = f"advisory:{bucket_name}:{source}:{lang}:{trend}"

                        # Skip if already cached and not expired
                        if self.cache.exists(cache_key):
                            continue

                        try:
                            context = {
                                "station_id": "precomputed",
                                "current_aqi": representative_aqi,
                                "forecast_trend": trend,
                                "dominant_source": source,
                                "attribution": {source: 40.0, "weather_driven": 25.0, "other": 35.0},
                                "language": lang,
                            }
                            result = await self.advisory_agent.generate_advisory_with_context(context)
                            self.cache.set(cache_key, result, CacheTTL.ADVISORY_LLM)
                            count += 1

                            # Rate limit for Gemini free tier
                            if self.advisory_agent.status == "gemini":
                                await asyncio.sleep(1)

                        except Exception as e:
                            print(f"  ⚠ Advisory precompute failed [{cache_key}]: {e}")

        return count

    def precompute_snapshots(self) -> int:
        """
        Build aggregate snapshots per station (the one-call-gets-all pattern).
        Frontend can load a station's entire state in one request.
        """
        count = 0
        for station in self.stations:
            sid = station["station_id"]
            forecast = self.cache.get_namespaced("forecast", sid)
            attribution = self.cache.get_namespaced("attribution", sid)

            if not forecast:
                continue

            # Determine AQI bucket for advisory lookup
            predicted_aqi = 200
            if forecast.get("predictions"):
                predicted_aqi = forecast["predictions"][0].get("predicted_aqi", 200)

            aqi_bucket = self._aqi_to_bucket(predicted_aqi)
            dominant_source = "vehicular_traffic"
            if attribution:
                dominant_source = max(attribution.items(), key=lambda x: x[1])[0]

            # Look up precomputed advisory
            advisory_key = f"advisory:{aqi_bucket}:{dominant_source}:en:stable"
            advisory = self.cache.get(advisory_key)

            snapshot = {
                "station": station,
                "current_aqi": predicted_aqi,
                "forecast": forecast,
                "attribution": attribution,
                "advisory_summary": advisory.get("advisory", "") if advisory else None,
                "computed_at": datetime.now().isoformat(),
                "cache_source": "precomputed",
            }

            self.cache.set_namespaced("snapshot", sid, snapshot, CacheTTL.SNAPSHOT)
            count += 1

        return count

    # ─── Full Refresh ─────────────────────────────────────

    async def run_full_refresh(self) -> Dict:
        """Run all precomputation tasks. Called on startup and every 6 hours."""
        print(f"\n{'='*60}")
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Starting full precomputation...")
        print(f"{'='*60}")

        start = time.time()

        # Step 1: Forecasts
        print("  → Precomputing forecasts...")
        forecast_count = self.precompute_forecasts()
        print(f"    ✓ {forecast_count} station forecasts cached")

        # Step 2: Attribution
        print("  → Precomputing attribution...")
        attr_count = self.precompute_attribution()
        print(f"    ✓ {attr_count} station attributions cached")

        # Step 3: Enforcement
        print("  → Computing enforcement priorities...")
        enforcement = self.precompute_enforcement()
        print(f"    ✓ {len(enforcement)} enforcement recommendations ranked")

        # Step 4: Advisories (LLM)
        print("  → Precomputing advisories...")
        advisory_count = await self.precompute_advisories()
        print(f"    ✓ {advisory_count} advisory variants cached")

        # Step 5: Snapshots
        print("  → Building station snapshots...")
        snapshot_count = self.precompute_snapshots()
        print(f"    ✓ {snapshot_count} station snapshots assembled")

        elapsed = round(time.time() - start, 2)
        stats = self.cache.stats

        print(f"\n  Done in {elapsed}s | Cache: {stats['size']} entries | "
              f"Hit rate: {stats['hit_rate_pct']}%")
        print(f"{'='*60}\n")

        return {
            "forecasts": forecast_count,
            "attributions": attr_count,
            "enforcement": len(enforcement),
            "advisories": advisory_count,
            "snapshots": snapshot_count,
            "elapsed_seconds": elapsed,
            "cache_stats": stats,
        }

    # ─── Background Scheduler ─────────────────────────────

    def start_background(self, interval_seconds: int = 21600):
        """Start precomputation in a background thread."""
        if self._running:
            return

        self._running = True

        def _loop():
            while self._running:
                try:
                    asyncio.run(self.run_full_refresh())
                except Exception as e:
                    print(f"⚠ Precomputation error: {e}")
                time.sleep(interval_seconds)

        self._thread = threading.Thread(target=_loop, daemon=True)
        self._thread.start()
        print(f"✓ Scheduler started (interval: {interval_seconds}s)")

    def stop(self):
        """Stop background scheduler."""
        self._running = False

    # ─── Utilities ────────────────────────────────────────

    def _aqi_to_bucket(self, aqi: int) -> str:
        """Map AQI value to bucket name for advisory cache lookup."""
        if aqi <= 50:
            return "good"
        if aqi <= 100:
            return "satisfactory"
        if aqi <= 200:
            return "moderate"
        if aqi <= 300:
            return "poor"
        if aqi <= 400:
            return "very_poor"
        return "severe"


# ─── Module-level instance ────────────────────────────────

_scheduler: PrecomputeScheduler = None


def get_scheduler() -> PrecomputeScheduler:
    """Get or create scheduler singleton."""
    global _scheduler
    if _scheduler is None:
        _scheduler = PrecomputeScheduler()
    return _scheduler
