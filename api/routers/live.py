"""
Live AQI endpoint — fetches real-time AQI from OpenAQ (v3 API).
Gets all active Indian monitoring stations and their latest readings.

Strategy to handle OpenAQ rate limits (free tier ~60 req/min):
- Locations list: 1 API call (all 740 stations)
- Latest readings: fetched in small batches (5 concurrent, 12s gaps)
- Startup worker gradually fills cache over ~25 min
- Hourly refresh keeps data fresh
- Everything cached for 1 hour
"""

import os
import asyncio
import httpx
from fastapi import APIRouter, BackgroundTasks
from typing import List, Dict, Optional
from dotenv import load_dotenv
from cache import get_cache, CacheTTL

load_dotenv()

router = APIRouter()

OPENAQ_API_KEY = os.environ.get("OPENAQ_API_KEY", "")
OPENAQ_BASE = "https://api.openaq.org/v3"

# India's country ID in OpenAQ
INDIA_COUNTRY_ID = 9

# Rate-limit safe settings for FAST initial fetch (gets ~60 stations quickly)
FAST_BATCH_SIZE = 5
FAST_BATCH_DELAY = 2.0

# Rate-limit safe settings for SLOW background fill (gets ALL stations over ~25 min)
SLOW_BATCH_SIZE = 5
SLOW_BATCH_DELAY = 12.0  # 5 req per 12s = 25 req/min (well under 60/min limit)

MAX_STATIONS = 700

# State tracking
_refresh_in_progress = False
_slow_fill_running = False


def _headers() -> dict:
    """Return auth headers for OpenAQ API."""
    return {"X-API-Key": OPENAQ_API_KEY} if OPENAQ_API_KEY else {}


def _pm25_to_aqi(pm25: float) -> int:
    """Convert PM2.5 (µg/m³) to India AQI using CPCB breakpoints."""
    breakpoints = [
        (0, 30, 0, 50),
        (31, 60, 51, 100),
        (61, 90, 101, 200),
        (91, 120, 201, 300),
        (121, 250, 301, 400),
        (251, 500, 401, 500),
    ]
    for c_low, c_high, i_low, i_high in breakpoints:
        if pm25 <= c_high:
            aqi = ((i_high - i_low) / (c_high - c_low)) * (pm25 - c_low) + i_low
            return round(aqi)
    return 500


def _pm10_to_aqi(pm10: float) -> int:
    """Convert PM10 (µg/m³) to India AQI using CPCB breakpoints."""
    breakpoints = [
        (0, 50, 0, 50),
        (51, 100, 51, 100),
        (101, 250, 101, 200),
        (251, 350, 201, 300),
        (351, 430, 301, 400),
        (431, 600, 401, 500),
    ]
    for c_low, c_high, i_low, i_high in breakpoints:
        if pm10 <= c_high:
            aqi = ((i_high - i_low) / (c_high - c_low)) * (pm10 - c_low) + i_low
            return round(aqi)
    return 500


def _no2_to_aqi(no2: float) -> int:
    """Convert NO2 (µg/m³) to India AQI."""
    breakpoints = [
        (0, 40, 0, 50),
        (41, 80, 51, 100),
        (81, 180, 101, 200),
        (181, 280, 201, 300),
        (281, 400, 301, 400),
        (401, 800, 401, 500),
    ]
    for c_low, c_high, i_low, i_high in breakpoints:
        if no2 <= c_high:
            aqi = ((i_high - i_low) / (c_high - c_low)) * (no2 - c_low) + i_low
            return round(aqi)
    return 500


def _compute_aqi(pollutants: Dict[str, Optional[float]]) -> tuple:
    """
    Compute India AQI from available pollutants.
    Returns (aqi, dominant_pollutant). Uses MAX sub-index (worst pollutant).
    """
    sub_indices = {}

    if pollutants.get("pm25") is not None and pollutants["pm25"] >= 0:
        sub_indices["pm25"] = _pm25_to_aqi(pollutants["pm25"])
    if pollutants.get("pm10") is not None and pollutants["pm10"] >= 0:
        sub_indices["pm10"] = _pm10_to_aqi(pollutants["pm10"])
    if pollutants.get("no2") is not None and pollutants["no2"] >= 0:
        sub_indices["no2"] = _no2_to_aqi(pollutants["no2"])

    if not sub_indices:
        return None, None

    dominant = max(sub_indices, key=sub_indices.get)
    return sub_indices[dominant], dominant


async def _fetch_location_latest(
    client: httpx.AsyncClient, loc_id: int, sensors: list
) -> Optional[Dict]:
    """Fetch latest readings for one location."""
    try:
        resp = await client.get(
            f"{OPENAQ_BASE}/locations/{loc_id}/latest", headers=_headers()
        )

        # Rate limited — skip this one
        if resp.status_code == 429:
            return None
        if resp.status_code != 200:
            return None

        data = resp.json()
        readings = data.get("results", [])
        if not readings:
            return None

        # Map sensor IDs to parameter names
        sensor_map = {s.get("id"): s.get("parameter", {}).get("name", "") for s in sensors}

        pollutants = {}
        for r in readings:
            sid = r.get("sensorsId")
            value = r.get("value")
            param_name = sensor_map.get(sid, "")
            if param_name and value is not None:
                pollutants[param_name] = value

        return pollutants if pollutants else None

    except Exception:
        return None


async def _get_active_locations(client: httpx.AsyncClient) -> List[Dict]:
    """Fetch and filter active Indian locations (1 API call)."""
    for attempt in range(3):
        resp = await client.get(
            f"{OPENAQ_BASE}/locations",
            headers=_headers(),
            params={"countries_id": INDIA_COUNTRY_ID, "limit": 1000},
        )
        if resp.status_code == 429:
            await asyncio.sleep(10 * (attempt + 1))
            continue
        break

    if resp.status_code != 200:
        return []

    locations = resp.json().get("results", [])

    active = []
    for loc in locations:
        dt_last = loc.get("datetimeLast")
        if not dt_last:
            continue
        if dt_last.get("utc", "") < "2024-":
            continue
        coords = loc.get("coordinates", {})
        if not coords.get("latitude") or not coords.get("longitude"):
            continue
        active.append(loc)

    return active[:MAX_STATIONS]


async def _fetch_stations_batch(
    client: httpx.AsyncClient,
    locations: List[Dict],
    batch_size: int,
    batch_delay: float,
    max_batches: int = 9999,
) -> List[Dict]:
    """
    Fetch latest data for a list of locations in rate-limited batches.
    Returns list of city dicts with AQI.
    """
    cities: List[Dict] = []
    consecutive_failures = 0
    batches_done = 0

    for i in range(0, len(locations), batch_size):
        if batches_done >= max_batches:
            break

        batch = locations[i : i + batch_size]
        tasks = [
            _fetch_location_latest(client, loc["id"], loc.get("sensors", []))
            for loc in batch
        ]
        results = await asyncio.gather(*tasks)

        # Check for rate limiting
        none_count = sum(1 for r in results if r is None)
        if none_count == len(results):
            consecutive_failures += 1
            if consecutive_failures >= 3:
                print(f"⚠ Rate limited after {i} requests, got {len(cities)} stations")
                break
            await asyncio.sleep(15)
            continue
        else:
            consecutive_failures = 0

        # Process results
        for loc, pollutants in zip(batch, results):
            if not pollutants:
                continue
            aqi, dominant = _compute_aqi(pollutants)
            if aqi is None:
                continue
            coords = loc.get("coordinates", {})
            cities.append({
                "city": loc.get("name", "Unknown"),
                "lat": coords.get("latitude"),
                "lon": coords.get("longitude"),
                "aqi": aqi,
                "pm25": round(pollutants["pm25"], 1) if pollutants.get("pm25") is not None else None,
                "pm10": round(pollutants["pm10"], 1) if pollutants.get("pm10") is not None else None,
                "dominant_pollutant": dominant,
                "source": "openaq_live",
                "location_id": loc["id"],
            })

        batches_done += 1

        # Pause between batches
        if i + batch_size < len(locations):
            await asyncio.sleep(batch_delay)

    cities.sort(key=lambda x: x["aqi"], reverse=True)
    return cities


async def _fast_fetch() -> List[Dict]:
    """Quick fetch — gets ~60 stations within rate limits (takes ~25s)."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        active = await _get_active_locations(client)
        if not active:
            return []
        return await _fetch_stations_batch(
            client, active, FAST_BATCH_SIZE, FAST_BATCH_DELAY
        )


async def _slow_fill_all_stations():
    """
    Background worker: gradually fetches ALL active stations over ~25 minutes.
    Runs at startup and merges results into cache progressively.
    5 requests every 12 seconds = 25 req/min (safe under 60/min limit).
    """
    global _slow_fill_running
    if _slow_fill_running:
        return
    _slow_fill_running = True

    print("🔄 Starting slow background fill of all India stations...")

    try:
        # Wait a bit for the fast initial fetch to complete first
        await asyncio.sleep(30)

        async with httpx.AsyncClient(timeout=30.0) as client:
            active = await _get_active_locations(client)
            if not active:
                print("⚠ Slow fill: could not fetch locations")
                return

            # Get already-cached location IDs so we skip them
            cache = get_cache()
            existing = cache.get("live:india_cities") or []
            existing_ids = {c["location_id"] for c in existing}

            # Filter to only locations we don't have yet
            remaining = [loc for loc in active if loc["id"] not in existing_ids]
            print(f"   Slow fill: {len(remaining)} stations remaining ({len(existing_ids)} already cached)")

            if not remaining:
                print("✓ All stations already cached")
                return

            # Fetch in slow batches, saving progress every 50 stations
            all_new: List[Dict] = []
            consecutive_failures = 0

            for i in range(0, len(remaining), SLOW_BATCH_SIZE):
                batch = remaining[i : i + SLOW_BATCH_SIZE]
                tasks = [
                    _fetch_location_latest(client, loc["id"], loc.get("sensors", []))
                    for loc in batch
                ]
                results = await asyncio.gather(*tasks)

                # Check for rate limiting
                none_count = sum(1 for r in results if r is None)
                if none_count == len(results):
                    consecutive_failures += 1
                    if consecutive_failures >= 5:
                        print(f"⚠ Slow fill: rate limited, got {len(all_new)} new stations")
                        break
                    await asyncio.sleep(30)
                    continue
                else:
                    consecutive_failures = 0

                # Process batch
                for loc, pollutants in zip(batch, results):
                    if not pollutants:
                        continue
                    aqi, dominant = _compute_aqi(pollutants)
                    if aqi is None:
                        continue
                    coords = loc.get("coordinates", {})
                    all_new.append({
                        "city": loc.get("name", "Unknown"),
                        "lat": coords.get("latitude"),
                        "lon": coords.get("longitude"),
                        "aqi": aqi,
                        "pm25": round(pollutants["pm25"], 1) if pollutants.get("pm25") is not None else None,
                        "pm10": round(pollutants["pm10"], 1) if pollutants.get("pm10") is not None else None,
                        "dominant_pollutant": dominant,
                        "source": "openaq_live",
                        "location_id": loc["id"],
                    })

                # Save progress every 50 new stations
                if len(all_new) % 50 < SLOW_BATCH_SIZE and len(all_new) > 0:
                    _merge_into_cache(all_new)
                    print(f"   Slow fill progress: {len(all_new)} new stations added (total in cache: {len((cache.get('live:india_cities') or []))})")

                # Rate-limit pause
                await asyncio.sleep(SLOW_BATCH_DELAY)

            # Final merge
            if all_new:
                _merge_into_cache(all_new)

            final_count = len(cache.get("live:india_cities") or [])
            print(f"✓ Slow fill complete: {final_count} total stations in cache")

    except Exception as e:
        print(f"⚠ Slow fill error: {e}")
    finally:
        _slow_fill_running = False


def _merge_into_cache(new_cities: List[Dict]):
    """Merge new station data into existing cache."""
    cache = get_cache()
    existing = cache.get("live:india_cities") or []
    existing_map = {c["location_id"]: c for c in existing}

    for c in new_cities:
        existing_map[c["location_id"]] = c

    merged = sorted(existing_map.values(), key=lambda x: x["aqi"], reverse=True)
    cache.set("live:india_cities", merged, CacheTTL.CURRENT_AQI)


def start_slow_fill():
    """Start the background slow fill task. Call this from app startup."""
    asyncio.ensure_future(_slow_fill_all_stations())


async def _background_refresh():
    """Background task to do a fast refresh and merge into cache."""
    global _refresh_in_progress
    if _refresh_in_progress:
        return
    _refresh_in_progress = True
    try:
        cities = await _fast_fetch()
        if cities:
            _merge_into_cache(cities)
            cache = get_cache()
            total = len(cache.get("live:india_cities") or [])
            print(f"✓ Background refresh: merged {len(cities)} stations (total: {total})")
    except Exception as e:
        print(f"⚠ Background refresh failed: {e}")
    finally:
        _refresh_in_progress = False


@router.get("/cities")
async def get_live_cities(background_tasks: BackgroundTasks):
    """
    Get live AQI for all active stations in India using OpenAQ v3 API.
    Returns cached data immediately. First call triggers fast fetch + slow background fill.
    """
    cache = get_cache()

    # Check cache first — instant response
    cached = cache.get("live:india_cities")
    if cached:
        # Schedule background refresh if TTL is low
        ttl = cache.get_ttl("live:india_cities")
        if ttl < 600:
            background_tasks.add_task(_background_refresh)
            background_tasks.add_task(_slow_fill_all_stations)
        return {"cities": cached, "source": "cache", "count": len(cached)}

    if not OPENAQ_API_KEY:
        return {"cities": [], "source": "error", "error": "No OPENAQ_API_KEY in .env"}

    # No cache — do a fast fetch (gets ~60 stations quickly)
    try:
        cities = await _fast_fetch()

        if not cities:
            return {
                "cities": [],
                "source": "error",
                "error": "Rate limited by OpenAQ — data will populate in background. Retry in 1 min.",
            }

        # Cache for 1 hour
        cache.set("live:india_cities", cities, CacheTTL.CURRENT_AQI)

        # Kick off slow background fill to get remaining stations
        background_tasks.add_task(_slow_fill_all_stations)

        return {
            "cities": cities,
            "source": "openaq_live",
            "count": len(cities),
        }

    except Exception as e:
        return {"cities": [], "source": "error", "error": str(e)[:200]}


@router.get("/city/{city_name}")
async def get_city_detail(city_name: str):
    """Get detailed AQI for a specific city using OpenAQ."""
    if not OPENAQ_API_KEY:
        return {"error": "No OPENAQ_API_KEY configured"}

    cache = get_cache()
    cache_key = f"live:city:{city_name.lower()}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Fetch Indian locations and search by name
            resp = await client.get(
                f"{OPENAQ_BASE}/locations",
                headers=_headers(),
                params={"countries_id": INDIA_COUNTRY_ID, "limit": 1000},
            )

            if resp.status_code != 200:
                return {"error": f"OpenAQ returned {resp.status_code}"}

            locations = resp.json().get("results", [])

            # Find matching location
            location = None
            search = city_name.lower()
            for loc in locations:
                if search in loc.get("name", "").lower():
                    location = loc
                    break

            if not location:
                return {"error": f"No station found for '{city_name}'"}

            loc_id = location["id"]
            sensors = location.get("sensors", [])

            # Fetch latest measurements
            resp2 = await client.get(
                f"{OPENAQ_BASE}/locations/{loc_id}/latest", headers=_headers()
            )

            if resp2.status_code != 200:
                return {"error": f"Could not fetch latest data for {city_name}"}

            measurements = resp2.json().get("results", [])

            # Build sensor → parameter map
            sensor_map = {s.get("id"): s.get("parameter", {}).get("name", "") for s in sensors}

            # Extract pollutant values
            pollutants: Dict[str, Optional[float]] = {
                "pm25": None, "pm10": None, "no2": None,
                "o3": None, "so2": None, "co": None,
            }
            measurement_time = None

            for m in measurements:
                sid = m.get("sensorsId")
                value = m.get("value")
                param_name = sensor_map.get(sid, "")
                if param_name in pollutants:
                    pollutants[param_name] = value
                if measurement_time is None:
                    measurement_time = m.get("datetime", {}).get("utc")

            overall_aqi, dominant = _compute_aqi(pollutants)

            result = {
                "city": city_name,
                "aqi": overall_aqi,
                "dominant_pollutant": dominant,
                "station_name": location.get("name"),
                "time": measurement_time,
                "pollutants": pollutants,
                "weather": {"temp": None, "humidity": None, "wind": None},
                "source": "openaq_live",
                "location_id": loc_id,
            }

            cache.set(cache_key, result, CacheTTL.CURRENT_AQI)
            return result

    except Exception as e:
        return {"error": str(e)[:200]}
