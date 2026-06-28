"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Info, TrendingUp, Activity, Cpu } from "lucide-react";
import { stations } from "@/lib/data";
import { getAqiColor, getAqiCategory, mockAqiForStation } from "@/lib/aqi";

interface ForecastPanelProps {
  stationId: string | null;
}

function buildForecast(stationId: string) {
  const base = mockAqiForStation(stationId) * 0.6; // PM2.5 approximation
  const history = [-3, -2, -1, 0].map((d) => ({
    label:
      d === 0
        ? "Today"
        : new Date(Date.now() + d * 86400000).toLocaleDateString("en-IN", {
            weekday: "short",
          }),
    pm25: Math.round(base + Math.sin(d) * 18 + (d === 0 ? 0 : d * 4)),
    type: "history" as const,
  }));
  const future = [1, 2, 3].map((d) => {
    const pm = Math.round(base + d * 6 + Math.sin(d * 1.5) * 22);
    return {
      label: new Date(Date.now() + d * 86400000).toLocaleDateString("en-IN", {
        weekday: "short",
      }),
      pm25: pm,
      lower: Math.round(pm * 0.8),
      upper: Math.round(pm * 1.2),
      type: "forecast" as const,
    };
  });
  return { series: [...history, ...future], future };
}

export default function ForecastPanel({ stationId }: ForecastPanelProps) {
  const station = stations.find((s) => s.station_id === stationId);
  const data = useMemo(
    () => (stationId ? buildForecast(stationId) : null),
    [stationId]
  );

  if (!stationId || !data) return <EmptyState />;

  return (
    <div className="h-full flex flex-col gap-5 animate-fade-in">
      <div className="card !p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold">{station?.station_name}</h3>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Cpu size={13} /> XGBoost · RMSE 83.38 baseline
          </span>
        </div>
        <p className="text-xs text-muted mb-4">
          PM2.5 trend — last 3 days and 3-day forecast
        </p>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data.series}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="pmGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--text-primary)",
                  fontSize: 13,
                }}
              />
              <Area
                type="monotone"
                dataKey="pm25"
                stroke="#06b6d4"
                strokeWidth={2.5}
                fill="url(#pmGrad)"
                dot={{ r: 3, fill: "#06b6d4" }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Forecast cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {data.future.map((f, i) => {
          const aqi = Math.round(f.pm25 * 1.6);
          const cat = getAqiCategory(aqi);
          const color = getAqiColor(cat);
          return (
            <div
              key={f.label}
              className="card !p-5 animate-slide-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted">
                  Day {i + 1} · {f.label}
                </span>
                <TrendingUp size={15} style={{ color }} />
              </div>
              <p className="text-4xl font-bold" style={{ color }}>
                {f.pm25}
              </p>
              <p className="text-[11px] text-muted mt-1">µg/m³ PM2.5</p>
              <div
                className="mt-3 inline-flex px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{ background: `${color}1a`, color }}
              >
                {cat} · AQI {aqi}
              </div>
              <p className="text-[11px] text-muted mt-3">
                Range {f.lower}–{f.upper} µg/m³
              </p>
            </div>
          );
        })}
      </div>

      <div className="card !p-4 flex items-start gap-3">
        <Info size={16} className="text-brand-400 mt-0.5 shrink-0" />
        <p className="text-xs text-secondary leading-relaxed">
          Forecasts use 72 engineered features (lags, rolling stats, weather,
          fire activity, wind decomposition). Currently showing mock values —
          real predictions activate once the trained model is dropped into{" "}
          <code className="px-1 py-0.5 rounded surface-subtle text-[11px]">
            /models
          </code>
          .
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card h-full flex flex-col items-center justify-center text-center gap-3">
      <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500/10">
        <Activity size={26} className="text-brand-400" />
      </span>
      <div>
        <p className="font-medium">No station selected</p>
        <p className="text-sm text-muted mt-1">
          Pick a station on the Map to view its forecast
        </p>
      </div>
    </div>
  );
}
