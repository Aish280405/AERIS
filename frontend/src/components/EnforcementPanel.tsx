"use client";

import { useEffect, useState } from "react";
import { Shield, AlertTriangle, MapPin, TrendingDown, Clock } from "lucide-react";
import { fetchEnforcement, EnforcementRec } from "@/lib/api";

const urgencyStyle: Record<string, { text: string; bg: string }> = {
  critical: { text: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  high: { text: "#f97316", bg: "rgba(249,115,22,0.1)" },
  medium: { text: "#eab308", bg: "rgba(234,179,8,0.1)" },
};

const sourceLabels: Record<string, string> = {
  vehicular_traffic: "Vehicular Traffic",
  industrial: "Industrial",
  construction: "Construction",
  biomass_burning: "Biomass Burning",
  weather_driven: "Weather-driven",
};

export default function EnforcementPanel() {
  const [recs, setRecs] = useState<EnforcementRec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnforcement().then((data) => {
      setRecs(data || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="card h-64 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    );
  }

  const criticalCount = recs.filter((r) => r.urgency === "critical").length;

  return (
    <div className="h-full flex flex-col gap-5 animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card !p-4">
          <p className="text-xs text-muted mb-1">Total Recommendations</p>
          <p className="text-3xl font-bold">{recs.length}</p>
        </div>
        <div className="card !p-4">
          <p className="text-xs text-muted mb-1">Critical Priority</p>
          <p className="text-3xl font-bold text-rose-500">{criticalCount}</p>
        </div>
        <div className="card !p-4 col-span-2 lg:col-span-1">
          <p className="text-xs text-muted mb-1">Source</p>
          <p className="text-sm font-medium mt-2 flex items-center gap-1.5 text-[var(--accent)]">
            <Clock size={14} />
            {recs.length > 0 ? "Live from model" : "No data"}
          </p>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {recs.map((rec, i) => {
          const u = urgencyStyle[rec.urgency] || urgencyStyle.medium;
          return (
            <div key={rec.rank} className="card !p-5 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold text-white shrink-0 bg-[var(--accent)]">
                    {rec.rank}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-muted" />
                      <span className="font-semibold">{rec.area}</span>
                    </div>
                    <span className="text-[11px] text-muted">
                      {sourceLabels[rec.primary_source] || rec.primary_source} ({rec.source_contribution}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: u.text, background: u.bg }}
                  >
                    {rec.urgency}
                  </span>
                  <div className="text-right">
                    <p className="text-2xl font-bold leading-none" style={{ color: u.text }}>
                      {rec.predicted_aqi}
                    </p>
                    <p className="text-[10px] text-muted">AQI</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pl-12">
                <div className="flex items-start gap-2 text-sm">
                  <Shield size={14} className="text-[var(--accent)] mt-0.5 shrink-0" />
                  <span>{rec.recommended_action}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-secondary">
                  <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <span>{rec.evidence}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-emerald-500">
                  <TrendingDown size={14} className="mt-0.5 shrink-0" />
                  <span>{rec.estimated_impact}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {recs.length === 0 && (
        <div className="card !p-5 text-center text-muted">
          No enforcement data. Start the backend API to see live recommendations.
        </div>
      )}
    </div>
  );
}
