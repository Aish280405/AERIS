"use client";

import { useEffect, useState } from "react";
import { Info, Activity, Cpu, Search } from "lucide-react";
import { useStations, fetchStations } from "@/lib/data";
import { getAqiColor, getAqiCategory } from "@/lib/aqi";
import { fetchSnapshot, StationSnapshot } from "@/lib/api";

interface ForecastPanelProps {
  stationId: string | null;
}

export default function ForecastPanel({ stationId: initialStationId }: ForecastPanelProps) {
  const stations = useStations();
  const [snapshot, setSnapshot] = useState<StationSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stationId, setStationId] = useState(initialStationId);
  const [showDropdown, setShowDropdown] = useState(false);

  // Sync with parent selection
  useEffect(() => {
    if (initialStationId) setStationId(initialStationId);
  }, [initialStationId]);

  useEffect(() => {
    if (!stationId) return;
    setLoading(true);
    fetchSnapshot(stationId).then((data) => {
      setSnapshot(data);
      setLoading(false);
    });
  }, [stationId]);

  const station = stations.find((s) => s.station_id === stationId);

  // Filtered stations for search
  const filtered = stations.filter((s) =>
    s.station_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!stationId) return <EmptyState onSelect={setStationId} />;

  if (loading) {
    return (
      <div className="card h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    );
  }

  const predictions = snapshot?.forecast?.predictions || [];
  const modelStatus = snapshot?.forecast?.model_status || "unavailable";

  return (
    <div className="h-full flex flex-col gap-5 animate-fade-in">
      {/* Station search */}
      <div className="card !p-4">
        <div className="relative">
          <div className="flex items-center gap-2 surface-subtle px-3 py-2.5 rounded-xl">
            <Search size={15} className="text-muted shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search stations..."
              className="bg-transparent text-sm outline-none w-full placeholder:text-muted"
            />
            {station && (
              <span className="text-xs text-[var(--accent)] font-medium whitespace-nowrap">
                {station.station_name.split(",")[0]}
              </span>
            )}
          </div>
          {showDropdown && searchQuery && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowDropdown(false)} />
              <div className="absolute z-40 top-full mt-2 w-full max-h-48 overflow-y-auto surface rounded-xl shadow-xl p-2">
                {filtered.map((s) => (
                  <button
                    key={s.station_id}
                    onClick={() => {
                      setStationId(s.station_id);
                      setSearchQuery("");
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--bg-subtle)] transition-colors text-secondary"
                  >
                    {s.station_name}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="px-3 py-2 text-sm text-muted">No stations found</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card !p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold">{station?.station_name}</h3>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Cpu size={13} />
            {modelStatus === "trained" ? "XGBoost (live)" : "Mock predictions"}
          </span>
        </div>
        <p className="text-xs text-muted mb-4">
          PM2.5 forecast — next {predictions.length} day(s)
        </p>
      </div>

      {/* Forecast cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {predictions.map((p, i) => {
          const cat = getAqiCategory(p.predicted_aqi);
          const color = getAqiColor(cat);
          return (
            <div
              key={p.day_ahead}
              className="card !p-5 animate-slide-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted">Day {p.day_ahead}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-muted">
                  {p.model_used}
                </span>
              </div>
              <p className="text-4xl font-bold" style={{ color }}>
                {p.predicted_pm25}
              </p>
              <p className="text-[11px] text-muted mt-1">µg/m³ PM2.5</p>
              <div
                className="mt-3 inline-flex px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
              >
                {cat} · AQI {p.predicted_aqi}
              </div>
              {p.confidence_lower && (
                <p className="text-[11px] text-muted mt-2">
                  Range: {p.confidence_lower}–{p.confidence_upper} µg/m³
                </p>
              )}
            </div>
          );
        })}
      </div>

      {predictions.length === 0 && (
        <div className="card !p-5">
          <p className="text-sm text-muted">
            No forecast available. Make sure the backend API is running.
          </p>
        </div>
      )}

      <div className="card !p-4 flex items-start gap-3">
        <Info size={16} className="text-[var(--accent)] mt-0.5 shrink-0" />
        <p className="text-xs text-secondary leading-relaxed">
          {modelStatus === "trained"
            ? "Predictions from trained XGBoost model using real station features (61 features including lags, weather, fire, and land-use data)."
            : "Using mock predictions. Train the ML model to enable live XGBoost forecasts."}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ onSelect }: { onSelect?: (id: string) => void }) {
  const stations = useStations();
  const [search, setSearch] = useState("");
  const filtered = stations.filter((s) =>
    s.station_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="card flex flex-col items-center justify-center text-center gap-4 py-12">
        <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--accent-soft)]">
          <Activity size={26} className="text-[var(--accent)]" />
        </span>
        <div>
          <p className="font-medium">Select a station</p>
          <p className="text-sm text-muted mt-1">Search or pick a station to view its forecast</p>
        </div>
      </div>
      <div className="card !p-4">
        <div className="flex items-center gap-2 surface-subtle px-3 py-2.5 rounded-xl mb-3">
          <Search size={15} className="text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stations..."
            className="bg-transparent text-sm outline-none w-full placeholder:text-muted"
          />
        </div>
        <div className="max-h-96 overflow-y-auto space-y-1">
          {(search ? filtered : stations).map((s) => (
            <button
              key={s.station_id}
              onClick={() => onSelect?.(s.station_id)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--bg-subtle)] transition-colors text-secondary"
            >
              {s.station_name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
