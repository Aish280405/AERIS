"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo } from "react";
import { Activity, AlertTriangle, Gauge, TrendingUp } from "lucide-react";
import { stations } from "@/lib/data";
import {
  getAqiColor,
  getAqiCategory,
  mockAqiForStation,
} from "@/lib/aqi";
import { useTheme } from "@/lib/theme";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), {
  ssr: false,
});

interface MapDashboardProps {
  onStationSelect: (id: string) => void;
  selectedStation: string | null;
}

const DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const LIGHT_TILES =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

export default function MapDashboard({
  onStationSelect,
  selectedStation,
}: MapDashboardProps) {
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  useEffect(() => setMounted(true), []);

  const readings = useMemo(
    () =>
      stations.map((s) => ({
        ...s,
        aqi: mockAqiForStation(s.station_id),
      })),
    []
  );

  const stats = useMemo(() => {
    const avg = Math.round(
      readings.reduce((a, b) => a + b.aqi, 0) / readings.length
    );
    const worst = readings.reduce((a, b) => (b.aqi > a.aqi ? b : a));
    const severe = readings.filter((r) => r.aqi > 300).length;
    return { avg, worst, severe };
  }, [readings]);

  return (
    <div className="h-full flex flex-col gap-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Gauge size={18} />}
          label="City Avg AQI"
          value={stats.avg.toString()}
          accent={getAqiColor(getAqiCategory(stats.avg))}
          sub={getAqiCategory(stats.avg)}
        />
        <StatCard
          icon={<AlertTriangle size={18} />}
          label="Worst Station"
          value={stats.worst.aqi.toString()}
          accent={getAqiColor(getAqiCategory(stats.worst.aqi))}
          sub={stats.worst.station_name.split(",")[0]}
        />
        <StatCard
          icon={<Activity size={18} />}
          label="Severe Zones"
          value={stats.severe.toString()}
          accent="#9333ea"
          sub="AQI > 300"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Active Stations"
          value={stations.length.toString()}
          accent="#22d3ee"
          sub="reporting live"
        />
      </div>

      {/* Map */}
      <div className="card flex-1 flex flex-col !p-0 overflow-hidden min-h-[400px]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b">
          <div>
            <h3 className="font-semibold text-sm">Delhi Monitoring Network</h3>
            <p className="text-[11px] text-muted">
              Click a station to inspect forecasts & sources
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {["Good", "Moderate", "Poor", "Very Poor", "Severe"].map((cat) => (
              <div
                key={cat}
                className="flex items-center gap-1.5 text-[11px] text-secondary"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: getAqiColor(cat) }}
                />
                {cat}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 relative">
          {mounted ? (
            <MapContainer
              center={[28.6139, 77.209]}
              zoom={11}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url={theme === "dark" ? DARK_TILES : LIGHT_TILES}
              />
              {readings.map((s) => {
                const color = getAqiColor(getAqiCategory(s.aqi));
                const selected = selectedStation === s.station_id;
                return (
                  <CircleMarker
                    key={s.station_id}
                    center={[s.lat, s.lon]}
                    radius={selected ? 13 : 8}
                    fillColor={color}
                    color={selected ? "#ffffff" : color}
                    weight={selected ? 3 : 1.5}
                    fillOpacity={0.75}
                    eventHandlers={{ click: () => onStationSelect(s.station_id) }}
                  >
                    <Popup>
                      <div className="text-sm min-w-[160px]">
                        <p className="font-bold mb-1">{s.station_name}</p>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-2xl font-bold"
                            style={{ color }}
                          >
                            {s.aqi}
                          </span>
                          <span className="text-xs" style={{ color }}>
                            {getAqiCategory(s.aqi)}
                          </span>
                        </div>
                        <p className="text-xs opacity-70">
                          {s.pollutants.join(" · ")}
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          ) : (
            <div className="absolute inset-0 shimmer flex items-center justify-center">
              <p className="text-sm text-muted">Loading map…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="card !p-4 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ background: `${accent}1a`, color: accent }}
        >
          {icon}
        </span>
      </div>
      <p className="text-3xl font-bold tracking-tight" style={{ color: accent }}>
        {value}
      </p>
      <p className="text-[11px] text-muted mt-1 truncate">{sub}</p>
    </div>
  );
}
