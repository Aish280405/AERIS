"use client";

import { useEffect, useState } from "react";
import { PieChart as PieIcon, Sparkles } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { stations } from "@/lib/data";
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

export default function AttributionPanel({ stationId }: AttributionPanelProps) {
  const [snapshot, setSnapshot] = useState<StationSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stationId) return;
    setLoading(true);
    fetchSnapshot(stationId).then((data) => {
      setSnapshot(data);
      setLoading(false);
    });
  }, [stationId]);

  const station = stations.find((s) => s.station_id === stationId);

  if (!stationId) return <EmptyState />;
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

function EmptyState() {
  return (
    <div className="card h-full flex flex-col items-center justify-center text-center gap-3">
      <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--accent-soft)]">
        <PieIcon size={26} className="text-[var(--accent)]" />
      </span>
      <div>
        <p className="font-medium">No station selected</p>
        <p className="text-sm text-muted mt-1">Pick a station on the Map to see source attribution</p>
      </div>
    </div>
  );
}
