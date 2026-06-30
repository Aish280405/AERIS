/**
 * AERIS API Client
 * All frontend components fetch real data from here.
 * Falls back to null when backend is unavailable.
 */

const API_BASE = "http://localhost:8000";

export interface StationSnapshot {
  station: {
    station_id: string;
    station_name: string;
    city: string;
    lat: number;
    lon: number;
    pollutants?: string[];
  };
  current_aqi: number;
  forecast: {
    station_id: string;
    model_status: string;
    predictions: Array<{
      day_ahead: number;
      predicted_pm25: number;
      predicted_aqi: number;
      confidence_lower?: number;
      confidence_upper?: number;
      model_used: string;
    }>;
  };
  attribution: Record<string, number> | null;
  advisory_summary: string | null;
  computed_at: string;
  cache_source: string;
}

export interface EnforcementRec {
  rank: number;
  station_id: string;
  area: string;
  lat: number | null;
  lon: number | null;
  predicted_aqi: number;
  primary_source: string;
  source_contribution: number;
  priority_score: number;
  urgency: string;
  recommended_action: string;
  evidence: string;
  estimated_impact: string;
}

export interface CacheStats {
  cache: {
    hits: number;
    misses: number;
    sets: number;
    size: number;
    hit_rate_pct: number;
    backend: string;
  };
  health: string;
}

// ─── Fetch helpers ───────────────────────────────────

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Public API methods ──────────────────────────────

export async function fetchSnapshot(stationId: string): Promise<StationSnapshot | null> {
  return apiFetch(`/api/v1/snapshot/${stationId}`);
}

export async function fetchAllSnapshots(stationIds: string[]): Promise<Record<string, StationSnapshot>> {
  const results: Record<string, StationSnapshot> = {};
  // Fetch in parallel
  const promises = stationIds.map(async (id) => {
    const snap = await fetchSnapshot(id);
    if (snap) results[id] = snap;
  });
  await Promise.all(promises);
  return results;
}

export async function fetchForecast(stationId: string) {
  return apiFetch<any>(`/api/v1/forecast/${stationId}`);
}

export async function fetchAttribution(stationId: string) {
  return apiFetch<any>(`/api/v1/attribution/${stationId}`);
}

export async function fetchEnforcement(): Promise<EnforcementRec[] | null> {
  const data = await apiFetch<{ recommendations: EnforcementRec[] }>(`/api/v1/enforcement`);
  return data?.recommendations || null;
}

export async function fetchAdvisory(aqi: number, source: string, language: string, trend: string) {
  return apiFetch<any>(
    `/api/v1/advisory?aqi=${aqi}&source=${source}&language=${language}&trend=${trend}`
  );
}

export async function fetchCacheStats(): Promise<CacheStats | null> {
  return apiFetch(`/api/v1/stats`);
}

export async function triggerRefresh() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/refresh`, { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Live AQI ────────────────────────────────────────

export interface LiveCity {
  city: string;
  lat: number;
  lon: number;
  pm25: number | null;
  aqi: number | null;
  source: string;
  location_name?: string;
}

export async function fetchLiveCities(): Promise<LiveCity[]> {
  const data = await apiFetch<{ cities: LiveCity[] }>("/api/live/cities");
  return data?.cities || [];
}
