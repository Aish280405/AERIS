"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieIcon, Sparkles } from "lucide-react";
import { stations } from "@/lib/data";
import { mockAqiForStation } from "@/lib/aqi";

interface AttributionPanelProps {
  stationId: string | null;
}

const sourceColors: Record<string, string> = {
  "Vehicular Traffic": "#ef4444",
  Industrial: "#f97316",
  "Construction Dust": "#eab308",
  "Biomass Burning": "#84cc16",
  "Weather-driven": "#06b6d4",
  "Secondary Particles": "#8b5cf6",
};

function buildAttribution(stationId: string) {
  const seed = mockAqiForStation(stationId);
  const raw: Record<string, number> = {
    "Vehicular Traffic": 25 + (seed % 20),
    Industrial: 10 + (seed % 15),
    "Construction Dust": 5 + (seed % 10),
    "Biomass Burning": 5 + ((seed >> 2) % 15),
    "Weather-driven": 10 + ((seed >> 1) % 15),
    "Secondary Particles": 5 + ((seed >> 3) % 10),
  };
  const total = Object.values(raw).reduce((a, b) => a + b, 0);
  return Object.entries(raw)
    .map(([name, v]) => ({ name, value: Math.round((v / total) * 100) }))
    .sort((a, b) => b.value - a.value);
}

export default function AttributionPanel({ stationId }: AttributionPanelProps) {
  const station = stations.find((s) => s.station_id === stationId);
  const data = useMemo(
    () => (stationId ? buildAttribution(stationId) : null),
    [stationId]
  );

  if (!stationId || !data) return <EmptyState />;
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
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={3}
                  stroke="none"
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={sourceColors[d.name]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--text-primary)",
                    fontSize: 13,
                  }}
                  formatter={(v) => [`${v}%`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span
                className="text-3xl font-bold"
                style={{ color: sourceColors[dominant.name] }}
              >
                {dominant.value}%
              </span>
              <span className="text-[11px] text-muted text-center px-8">
                {dominant.name}
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown bars */}
        <div className="card">
          <h3 className="card-header">Source Breakdown</h3>
          <div className="space-y-3.5">
            {data.map((d, i) => (
              <div
                key={d.name}
                className="animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="flex items-center gap-2 text-secondary">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: sourceColors[d.name] }}
                    />
                    {d.name}
                  </span>
                  <span className="font-semibold">{d.value}%</span>
                </div>
                <div className="h-2 rounded-full surface-subtle overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${d.value}%`,
                      background: sourceColors[d.name],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insight */}
      <div
        className="card !p-5"
        style={{
          background:
            "linear-gradient(135deg, rgba(6,182,212,0.08), rgba(139,92,246,0.08))",
        }}
      >
        <div className="flex items-start gap-3">
          <Sparkles size={18} className="text-brand-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm">
              <span className="font-semibold">{dominant.name}</span> is the
              dominant pollution source here at{" "}
              <span className="font-semibold">{dominant.value}%</span>.
              Attribution is derived from SHAP feature groups: road density,
              industrial proximity, FIRMS fire hotspots, and weather patterns.
            </p>
            <p className="text-[11px] text-amber-500 mt-2">
              ⚠ Mock values — real SHAP attribution activates after model training
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card h-full flex flex-col items-center justify-center text-center gap-3">
      <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500/10">
        <PieIcon size={26} className="text-brand-400" />
      </span>
      <div>
        <p className="font-medium">No station selected</p>
        <p className="text-sm text-muted mt-1">
          Pick a station on the Map to see source attribution
        </p>
      </div>
    </div>
  );
}
