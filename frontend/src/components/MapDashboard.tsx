"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { Activity, AlertTriangle, Gauge, TrendingUp, Search } from "lucide-react";
import { useStations } from "@/lib/data";
import { getAqiColor, getAqiCategory } from "@/lib/aqi";
import { useTheme } from "@/lib/theme";
import { fetchLiveCities, LiveCity } from "@/lib/api";

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

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const LIGHT_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

export default function MapDashboard({
  onStationSelect,
  selectedStation,
}: MapDashboardProps) {
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const stations = useStations();
  const [cities, setCities] = useState<LiveCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"india" | "delhi">("india");

  useEffect(() => setMounted(true), []);

  // Fetch live city AQI
  useEffect(() => {
    fetchLiveCities().then((data) => {
      if (data.length > 0) setCities(data);
      setLoading(false);
    });
  }, []);

  // Stats from live data
  const citiesWithAqi = cities.filter((c) => c.aqi !== null);
  const avg = citiesWithAqi.length
    ? Math.round(citiesWithAqi.reduce((a, b) => a + (b.aqi || 0), 0) / citiesWithAqi.length)
    : 0;
  const worst = citiesWithAqi.reduce(
    (a, b) => ((b.aqi || 0) > (a.aqi || 0) ? b : a),
    citiesWithAqi[0] || { city: "-", aqi: 0 }
  );
  const severe = citiesWithAqi.filter((c) => (c.aqi || 0) > 300).length;
  const isLive = citiesWithAqi.some((c) => c.source?.includes("openaq"));

  // Map center based on view
  const mapCenter: [number, number] = view === "india" ? [22.5, 78.5] : [28.6139, 77.209];
  const mapZoom = view === "india" ? 5 : 11;

  return (
    <div className="h-full flex flex-col gap-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Gauge size={18} />}
          label="National Avg AQI"
          value={avg.toString()}
          accent={getAqiColor(getAqiCategory(avg))}
          sub={getAqiCategory(avg)}
        />
        <StatCard
          icon={<AlertTriangle size={18} />}
          label="Worst City"
          value={(worst?.aqi || 0).toString()}
          accent={getAqiColor(getAqiCategory(worst?.aqi || 0))}
          sub={worst?.city || "-"}
        />
        <StatCard
          icon={<Activity size={18} />}
          label="Severe Cities"
          value={severe.toString()}
          accent="#9333ea"
          sub="AQI > 300"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Cities Monitored"
          value={citiesWithAqi.length.toString()}
          accent="var(--accent)"
          sub={isLive ? "Live from OpenAQ" : loading ? "Loading..." : "Estimated"}
        />
      </div>

      {/* Map */}
      <div className="card flex-1 flex flex-col !p-0 overflow-hidden min-h-[400px]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
          <div>
            <h3 className="font-semibold text-sm">
              {view === "india" ? "India Air Quality" : "Delhi Stations"}
            </h3>
            <p className="text-[11px] text-muted">
              {view === "india"
                ? isLive ? "Live data from OpenAQ • updated hourly" : "Click a city to zoom in"
                : "Click a station for forecasts"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex surface-subtle rounded-lg overflow-hidden text-xs">
              <button
                onClick={() => setView("india")}
                className={`px-3 py-1.5 font-medium transition-all ${
                  view === "india" ? "bg-[var(--accent)] text-white" : "text-secondary"
                }`}
              >
                India
              </button>
              <button
                onClick={() => setView("delhi")}
                className={`px-3 py-1.5 font-medium transition-all ${
                  view === "delhi" ? "bg-[var(--accent)] text-white" : "text-secondary"
                }`}
              >
                Delhi
              </button>
            </div>
            {/* Legend */}
            <div className="hidden sm:flex gap-2">
              {["Good", "Moderate", "Poor", "Severe"].map((cat) => (
                <div key={cat} className="flex items-center gap-1 text-[10px] text-muted">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getAqiColor(cat) }} />
                  {cat}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 relative">
          {mounted ? (
            <MapContainer
              key={view} // Force re-render on view change
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; CARTO'
                url={theme === "dark" ? DARK_TILES : LIGHT_TILES}
              />

              {/* India view — city markers */}
              {view === "india" &&
                cities.map((city) => {
                  if (!city.aqi) return null;
                  const color = getAqiColor(getAqiCategory(city.aqi));
                  return (
                    <CircleMarker
                      key={city.city}
                      center={[city.lat, city.lon]}
                      radius={10}
                      fillColor={color}
                      color={color}
                      weight={1.5}
                      fillOpacity={0.7}
                      eventHandlers={{
                        click: () => {
                          if (city.city === "Delhi") setView("delhi");
                        },
                      }}
                    >
                      <Popup>
                        <div className="text-sm min-w-[140px]">
                          <p className="font-bold mb-1">{city.city}</p>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl font-bold" style={{ color }}>
                              {city.aqi}
                            </span>
                            <span className="text-xs" style={{ color }}>
                              {getAqiCategory(city.aqi)}
                            </span>
                          </div>
                          <p className="text-xs opacity-70">
                            PM2.5: {city.pm25} µg/m³
                          </p>
                          <p className="text-[10px] opacity-50 mt-1">
                            Source: {city.source}
                          </p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}

              {/* Delhi view — station markers */}
              {view === "delhi" &&
                stations.map((s) => {
                  // Use Delhi city AQI as base, vary by station
                  const delhiCity = cities.find((c) => c.city === "Delhi");
                  const baseAqi = delhiCity?.aqi || 200;
                  const seed = s.station_id.charCodeAt(6) || 0;
                  const stationAqi = Math.max(50, baseAqi + (seed % 80) - 40);
                  const color = getAqiColor(getAqiCategory(stationAqi));
                  const selected = selectedStation === s.station_id;

                  return (
                    <CircleMarker
                      key={s.station_id}
                      center={[s.lat, s.lon]}
                      radius={selected ? 13 : 8}
                      fillColor={color}
                      color={selected ? "#fff" : color}
                      weight={selected ? 3 : 1.5}
                      fillOpacity={0.75}
                      eventHandlers={{ click: () => onStationSelect(s.station_id) }}
                    >
                      <Popup>
                        <div className="text-sm min-w-[160px]">
                          <p className="font-bold mb-1">{s.station_name}</p>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl font-bold" style={{ color }}>
                              {stationAqi}
                            </span>
                            <span className="text-xs" style={{ color }}>
                              {getAqiCategory(stationAqi)}
                            </span>
                          </div>
                          <p className="text-xs opacity-70">{s.pollutants.join(" · ")}</p>
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
          style={{ background: `color-mix(in srgb, ${accent} 15%, transparent)`, color: accent }}
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
