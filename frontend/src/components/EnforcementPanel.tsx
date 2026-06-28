"use client";

import { Shield, AlertTriangle, MapPin, TrendingDown, Clock } from "lucide-react";

const recommendations = [
  {
    rank: 1,
    area: "Anand Vihar",
    predicted_aqi: 468,
    urgency: "critical",
    primary_source: "Vehicular + Industrial",
    action: "Deploy mobile inspection unit for industrial emissions check",
    evidence: "Forecast shows 45% AQI increase in next 24h",
    impact: "Could reduce AQI by 25% if acted within 6h",
  },
  {
    rank: 2,
    area: "Wazirpur",
    predicted_aqi: 412,
    urgency: "critical",
    primary_source: "Industrial",
    action: "Inspect industrial units for emission compliance",
    evidence: "Industrial contribution spiked 30% above baseline",
    impact: "Could reduce AQI by 20% if acted within 12h",
  },
  {
    rank: 3,
    area: "Jahangirpuri",
    predicted_aqi: 356,
    urgency: "high",
    primary_source: "Construction Dust",
    action: "Inspect construction sites for dust suppression compliance",
    evidence: "Construction dust at 22% — above threshold",
    impact: "Could reduce AQI by 15% with proper dust control",
  },
  {
    rank: 4,
    area: "Rohini",
    predicted_aqi: 310,
    urgency: "high",
    primary_source: "Biomass Burning",
    action: "Monitor biomass burning — satellite hotspot detected",
    evidence: "NASA FIRMS shows 3 active fire hotspots within 5km",
    impact: "Could reduce AQI by 18% if burning stopped",
  },
  {
    rank: 5,
    area: "Dwarka Sector 8",
    predicted_aqi: 285,
    urgency: "medium",
    primary_source: "Vehicular Traffic",
    action: "Set up traffic diversion — high vehicular pollution",
    evidence: "Road density drives 40% of PM2.5 here",
    impact: "Could reduce AQI by 12% with traffic management",
  },
];

const urgencyStyle: Record<string, { text: string; bg: string; border: string }> = {
  critical: { text: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" },
  high: { text: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)" },
  medium: { text: "#eab308", bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.3)" },
};

export default function EnforcementPanel() {
  const criticalCount = recommendations.filter(
    (r) => r.urgency === "critical"
  ).length;

  return (
    <div className="h-full flex flex-col gap-5 animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card !p-4">
          <p className="text-xs text-muted mb-1">Total Recommendations</p>
          <p className="text-3xl font-bold">{recommendations.length}</p>
        </div>
        <div className="card !p-4">
          <p className="text-xs text-muted mb-1">Critical Priority</p>
          <p className="text-3xl font-bold text-rose-500">{criticalCount}</p>
        </div>
        <div className="card !p-4 col-span-2 lg:col-span-1">
          <p className="text-xs text-muted mb-1">Generated</p>
          <p className="text-sm font-medium mt-2 flex items-center gap-1.5">
            <Clock size={14} className="text-brand-400" />
            {new Date().toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · today
          </p>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {recommendations.map((rec, i) => {
          const u = urgencyStyle[rec.urgency];
          return (
            <div
              key={rec.rank}
              className="card !p-5 animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold text-white shrink-0"
                    style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}
                  >
                    {rec.rank}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-muted" />
                      <span className="font-semibold">{rec.area}</span>
                    </div>
                    <span className="text-[11px] text-muted">
                      Primary: {rec.primary_source}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border"
                    style={{ color: u.text, background: u.bg, borderColor: u.border }}
                  >
                    {rec.urgency}
                  </span>
                  <div className="text-right">
                    <p className="text-2xl font-bold leading-none" style={{ color: u.text }}>
                      {rec.predicted_aqi}
                    </p>
                    <p className="text-[10px] text-muted">pred. AQI</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pl-12">
                <div className="flex items-start gap-2 text-sm">
                  <Shield size={14} className="text-brand-400 mt-0.5 shrink-0" />
                  <span>{rec.action}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-secondary">
                  <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <span>{rec.evidence}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-emerald-500">
                  <TrendingDown size={14} className="mt-0.5 shrink-0" />
                  <span>{rec.impact}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
