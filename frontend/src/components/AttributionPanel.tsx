"use client";

import { useEffect, useState } from "react";
import { PieChart as PieIcon, Sparkles } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useStations, fetchStations } from "@/lib/data";
import { fetchSnapshot, StationSnapshot } from "@/lib/api";

interface AttributionPanelProps {
  stationId: string | null;
}

const sourceColors: Record<string, string> = {
  vehicular_traffic: "#ef4444",
  industrial: "#f97316",
  construction: "#eab308",
  biomass_burning: "#84cc16",
  weather_driven: "#06b6d4",
  secondary_particles: "#8b5cf6",
};

const sourceLabels: Record<string, string> = {
  vehicular_traffic: "Vehicular Traffic",
  industrial: "Industrial",
  construction: "Construction Dust",
  biomass_burning: "Biomass Burning",
  weather_driven: "Weather-driven",
  secondary_particles: "Secondary Particles",
};

export default function AttributionPanel({ stationId: initialStationId }: AttributionPanelProps) {
  const stations = useStations();
  const [snapshot, setSnapshot] = useState<StationSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [stationId, setStationId] = useState(initialStationId);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch station list
  useEffect(() => { fetchStations(); }, []);

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

  const attribution = snapshot?.attribution || {};
  const data = Object.entries(attribution)
    .map(([name, value]) => ({ name, value: value as number, label: sourceLabels[name] || name }))
    .sort((a, b) => b.value - a.value);
  const dominant = data[0];

  return (
    <div className="h-full flex flex-col gap-5 animate-fade-in">
      {/* Station search */}
      <div className="card !p-4">
        <div className="relative">
          <div className="flex items-center gap-2 surface-subtle px-3 py-2.5 rounded-xl">
            <PieIcon size={15} className="text-muted shrink-0" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Donut */}
        <div className="card">
          <h3 className="card-header">{station?.station_name}</h3>
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={3}
                  stroke="none"
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={sourceColors[d.name] || "#64748b"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--text)",
                    fontSize: 13,
                  }}
                  formatter={(v: any) => [`${v}%`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            {dominant && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold" style={{ color: sourceColors[dominant.name] }}>
                  {dominant.value}%
                </span>
                <span className="text-[11px] text-muted text-center px-8">
                  {dominant.label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bars */}
        <div className="card">
          <h3 className="card-header">Source Breakdown</h3>
          <div className="space-y-3.5">
            {data.map((d, i) => (
              <div key={d.name} className="animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="flex items-center gap-2 text-secondary">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: sourceColors[d.name] || "#64748b" }}
                    />
                    {d.label}
                  </span>
                  <span className="font-semibold">{d.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${d.value}%`, background: sourceColors[d.name] || "#64748b" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {dominant && (
        <div className="card !p-5" style={{ background: "var(--accent-soft)" }}>
          <div className="flex items-start gap-3">
            <Sparkles size={18} className="text-[var(--accent)] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm">
                <span className="font-semibold">{dominant.label}</span> is the dominant pollution source at{" "}
                <span className="font-semibold">{dominant.value}%</span> contribution.
              </p>
              <p className="text-[11px] text-muted mt-2">
                {snapshot?.forecast?.model_status === "trained"
                  ? "Attribution based on feature-group analysis from the trained model."
                  : "Attribution will use real SHAP values once the SHAP explainer is added."}
              </p>
            </div>
          </div>
        </div>
      )}
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
          <PieIcon size={26} className="text-[var(--accent)]" />
        </span>
        <div>
          <p className="font-medium">No station selected</p>
          <p className="text-sm text-muted mt-1">Search or pick a station to see source attribution</p>
        </div>
      </div>
      <div className="card !p-4">
        <div className="flex items-center gap-2 surface-subtle px-3 py-2.5 rounded-xl mb-3">
          <PieIcon size={15} className="text-muted" />
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
