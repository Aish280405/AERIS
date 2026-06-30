"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";

const INDIA_STATIONS = [
  { lat: 28.6139, lng: 77.209, aqi: 364, city: "Delhi" },
  { lat: 19.076, lng: 72.8777, aqi: 185, city: "Mumbai" },
  { lat: 22.5726, lng: 88.3639, aqi: 220, city: "Kolkata" },
  { lat: 12.9716, lng: 77.5946, aqi: 92, city: "Bengaluru" },
  { lat: 13.0827, lng: 80.2707, aqi: 88, city: "Chennai" },
  { lat: 17.385, lng: 78.4867, aqi: 145, city: "Hyderabad" },
  { lat: 26.9124, lng: 75.7873, aqi: 175, city: "Jaipur" },
  { lat: 26.8467, lng: 80.9462, aqi: 240, city: "Lucknow" },
  { lat: 23.2599, lng: 77.4126, aqi: 160, city: "Bhopal" },
  { lat: 21.1458, lng: 79.0882, aqi: 130, city: "Nagpur" },
  { lat: 25.6093, lng: 85.1376, aqi: 195, city: "Patna" },
  { lat: 30.7333, lng: 76.7794, aqi: 210, city: "Chandigarh" },
  { lat: 23.0225, lng: 72.5714, aqi: 155, city: "Ahmedabad" },
];

function getColor(aqi: number): string {
  if (aqi <= 100) return "#10b981";
  if (aqi <= 200) return "#f59e0b";
  if (aqi <= 300) return "#f97316";
  return "#ef4444";
}

export default function IndiaGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const { theme } = useTheme();

  // Destroy and recreate globe when theme changes
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current._destructor?.();
      globeRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    }

    if (!containerRef.current) return;

    const isDark = theme === "dark";
    const atmosphereColor = isDark ? "#0d9488" : "#94a3b8";
    const globeImage = isDark
      ? "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      : "//unpkg.com/three-globe/example/img/earth-day.jpg";
    const arcColor = isDark
      ? ["rgba(94, 234, 212, 0.7)", "rgba(94, 234, 212, 0.1)"]
      : ["rgba(13, 148, 136, 0.7)", "rgba(13, 148, 136, 0.1)"];
    const ringColor = isDark
      ? (t: number) => `rgba(94, 234, 212, ${1 - t})`
      : (t: number) => `rgba(13, 148, 136, ${1 - t})`;

    import("globe.gl").then((Mod) => {
      const GlobeGL = Mod.default;
      const globe = new GlobeGL(containerRef.current!)
        .globeImageUrl(globeImage)
        .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
        .backgroundImageUrl("")
        .backgroundColor("rgba(0,0,0,0)")
        .width(680)
        .height(680)
        .showAtmosphere(true)
        .atmosphereColor(atmosphereColor)
        .atmosphereAltitude(0.25)
        .pointsData(INDIA_STATIONS)
        .pointLat("lat")
        .pointLng("lng")
        .pointColor((d: any) => getColor(d.aqi))
        .pointAltitude(0.1)
        .pointRadius((d: any) => Math.max(0.5, d.aqi / 200))
        .ringsData(INDIA_STATIONS.slice(0, 5))
        .ringLat("lat")
        .ringLng("lng")
        .ringColor(() => ringColor)
        .ringMaxRadius(4)
        .ringPropagationSpeed(2)
        .ringRepeatPeriod(1800)
        .arcsData([
          { startLat: 28.6139, startLng: 77.209, endLat: 19.076, endLng: 72.8777 },
          { startLat: 28.6139, startLng: 77.209, endLat: 22.5726, endLng: 88.3639 },
          { startLat: 28.6139, startLng: 77.209, endLat: 12.9716, endLng: 77.5946 },
          { startLat: 19.076, startLng: 72.8777, endLat: 13.0827, endLng: 80.2707 },
        ])
        .arcColor(() => arcColor)
        .arcDashLength(0.5)
        .arcDashGap(0.2)
        .arcDashAnimateTime(2000)
        .arcStroke(0.6);

      globe.pointOfView({ lat: 20, lng: 78, altitude: 1.8 }, 0);

      const controls = globe.controls() as any;
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.25;
        controls.enableZoom = false;
      }

      globeRef.current = globe;
      setLoaded(true);
    });

    return () => { globeRef.current?._destructor?.(); };
  }, [theme]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-[680px] h-[680px] max-w-full"
        style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.8s ease" }}
      />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
        </div>
      )}

      {/* Floating card — Delhi AQI */}
      <div className="absolute top-14 -right-2 surface p-3.5 !rounded-xl animate-float">
        <p className="text-[10px] font-semibold text-[var(--accent)]">Delhi</p>
        <p className="text-[10px] text-[var(--text-muted)]">AQI</p>
        <p className="text-2xl font-bold text-orange-500 leading-tight">162</p>
        <p className="text-[10px] font-medium text-orange-500">Unhealthy</p>
      </div>

      {/* Floating card — Forecast */}
      <div className="absolute bottom-20 -right-4 surface p-3.5 !rounded-xl animate-float" style={{ animationDelay: "2s" }}>
        <p className="text-[10px] font-semibold text-[var(--accent)]">Tomorrow</p>
        <p className="text-[10px] text-[var(--text-muted)]">PM2.5</p>
        <p className="text-2xl font-bold text-amber-500 leading-tight">128</p>
        <p className="text-[10px] font-medium text-amber-500">Moderate</p>
        <svg className="mt-2 w-16 h-4" viewBox="0 0 64 16">
          <polyline points="0,12 8,10 16,11 24,8 32,6 40,9 48,5 56,7 64,4" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
