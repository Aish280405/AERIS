"use client";

import { useState, useMemo, useEffect } from "react";
import { useStations, fetchStations } from "@/lib/data";
import {
  getAqiColor,
  getAqiCategory,
  mockAqiForStation,
} from "@/lib/aqi";
import {
  MapPin,
  Wind,
  Droplets,
  Thermometer,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "@/lib/language";
import { translations } from "@/lib/i18n";
import { fetchSnapshot, StationSnapshot } from "@/lib/api";

// ─── Advisories ─────────────────────────────────────
type Lang = "en" | "hi";
const advisories: Record<Lang, Record<string, { msg: string; tips: string[] }>> = {
  en: {
    Good: {
      msg: "Air quality is great! Perfect for outdoor activities.",
      tips: ["Great day for a walk or jog", "No masks needed"],
    },
    Satisfactory: {
      msg: "Air is okay. Sensitive individuals should be aware.",
      tips: ["Generally safe for all", "Sensitive people may limit heavy exertion"],
    },
    Moderate: {
      msg: "Air quality is moderate. Limit prolonged outdoor activity.",
      tips: ["Reduce long outdoor workouts", "Keep windows closed during traffic peaks", "Children and elderly should stay cautious"],
    },
    Poor: {
      msg: "Air is unhealthy. Minimize time outdoors.",
      tips: ["Wear an N95 mask outdoors", "Avoid outdoor exercise", "Keep doors and windows shut", "Use an air purifier at home"],
    },
    "Very Poor": {
      msg: "Air is very unhealthy. Stay indoors if possible.",
      tips: ["Do NOT exercise outdoors", "N95 mask mandatory if going out", "Keep all openings sealed", "Run air purifiers on high", "Children & elderly should stay inside"],
    },
    Severe: {
      msg: "Emergency! Air is hazardous. Do not go outside.",
      tips: ["STAY INDOORS", "Seal all windows & doors", "Air purifiers on maximum", "Seek medical help if difficulty breathing", "No school or outdoor work"],
    },
  },
  hi: {
    Good: {
      msg: "हवा बहुत अच्छी है! बाहर घूमने का मजा लें।",
      tips: ["टहलने या व्यायाम के लिए बढ़िया दिन", "मास्क की जरूरत नहीं"],
    },
    Satisfactory: {
      msg: "हवा ठीक है। संवेदनशील लोग ध्यान रखें।",
      tips: ["सभी के लिए सुरक्षित", "संवेदनशील लोग भारी मेहनत सीमित करें"],
    },
    Moderate: {
      msg: "हवा मध्यम है। लंबे समय बाहर रहने से बचें।",
      tips: ["लंबी बाहरी कसरत कम करें", "ट्रैफिक के समय खिड़कियां बंद रखें", "बच्चे और बुजुर्ग सावधान रहें"],
    },
    Poor: {
      msg: "हवा खराब है। बाहर कम समय बिताएं।",
      tips: ["बाहर N95 मास्क पहनें", "बाहर व्यायाम न करें", "दरवाजे-खिड़कियां बंद रखें", "एयर प्यूरीफायर चलाएं"],
    },
    "Very Poor": {
      msg: "हवा बहुत खराब है। घर के अंदर रहें।",
      tips: ["बाहर व्यायाम बिलकुल न करें", "बाहर जाएं तो N95 जरूरी", "सभी खिड़कियां सील करें", "प्यूरीफायर तेज पर चलाएं", "बच्चे और बुजुर्ग अंदर ही रहें"],
    },
    Severe: {
      msg: "आपातकाल! हवा खतरनाक है। बाहर न जाएं।",
      tips: ["घर में ही रहें", "खिड़कियां-दरवाजे सील करें", "प्यूरीफायर अधिकतम पर", "सांस की दिक्कत हो तो तुरंत डॉक्टर", "स्कूल/बाहरी काम बंद"],
    },
  },
};

// ─── Forecast builder ───────────────────────────────
function buildForecast(stationId: string, lang: Lang) {
  const base = mockAqiForStation(stationId);
  const locale = lang === "hi" ? "hi-IN" : "en-IN";
  return [1, 2, 3].map((d) => {
    const delta = Math.round(Math.sin(d * 1.2) * 40 + d * 8);
    const aqi = Math.max(30, base + delta);
    return {
      day: d,
      label: new Date(Date.now() + d * 86400000).toLocaleDateString(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      aqi,
      category: getAqiCategory(aqi),
      color: getAqiColor(getAqiCategory(aqi)),
      trend: delta > 10 ? ("up" as const) : delta < -10 ? ("down" as const) : ("stable" as const),
    };
  });
}

// ─── Component ──────────────────────────────────────
export default function CitizenDashboard() {
  const stations = useStations();
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const { language, setLanguage, t: strings } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Set default station once loaded
  useEffect(() => {
    if (stations.length > 0 && !selectedStationId) {
      setSelectedStationId(stations[0].station_id);
    }
  }, [stations, selectedStationId]);

  const station = stations.find((s) => s.station_id === selectedStationId);
  const [snapshot, setSnapshot] = useState<StationSnapshot | null>(null);

  useEffect(() => {
    if (!selectedStationId) return;
    fetchSnapshot(selectedStationId).then((data) => setSnapshot(data));
  }, [selectedStationId]);

  // Loading state while stations are being fetched
  if (!station || !selectedStationId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    );
  }

  // Use real data if available, fallback to mock
  const aqi = snapshot ? snapshot.current_aqi : mockAqiForStation(selectedStationId);
  const category = getAqiCategory(aqi);
  const color = getAqiColor(category);
  const localCategory = strings.categories[category] || category;
  const localDescription = strings.descriptions[category] || "";

  // Use real forecast from snapshot if available
  const forecast = useMemo(() => {
    if (snapshot?.forecast?.predictions?.length) {
      const locale = language === "hi" ? "hi-IN" : "en-IN";
      return snapshot.forecast.predictions.map((p) => {
        const predAqi = p.predicted_aqi;
        return {
          day: p.day_ahead,
          label: new Date(Date.now() + p.day_ahead * 86400000).toLocaleDateString(locale, {
            weekday: "short",
            day: "numeric",
            month: "short",
          }),
          aqi: predAqi,
          category: getAqiCategory(predAqi),
          color: getAqiColor(getAqiCategory(predAqi)),
          trend: predAqi > aqi + 30 ? ("up" as const) : predAqi < aqi - 30 ? ("down" as const) : ("stable" as const),
        };
      });
    }
    return buildForecast(selectedStationId, language);
  }, [selectedStationId, language, snapshot, aqi]);
  const advisory = advisories[language][category];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header — location picker + language toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Location dropdown */}
        <div className="relative flex-1 max-w-sm">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 surface-subtle rounded-xl text-sm font-medium transition-colors hover:border-[var(--border-strong)]"
          >
            <div className="flex items-center gap-2.5">
              <MapPin size={16} className="text-brand-400" />
              <span>{station.station_name}</span>
            </div>
            <ChevronDown
              size={16}
              className={`text-muted transition-transform ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute z-40 top-full mt-2 w-full max-h-64 overflow-y-auto surface rounded-xl shadow-xl p-2">
                {stations.map((s) => {
                  const sAqi = mockAqiForStation(s.station_id);
                  const sColor = getAqiColor(getAqiCategory(sAqi));
                  return (
                    <button
                      key={s.station_id}
                      onClick={() => {
                        setSelectedStationId(s.station_id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left transition-colors hover:bg-[var(--bg-subtle)] ${
                        s.station_id === selectedStationId
                          ? "bg-[var(--accent-soft)]"
                          : ""
                      }`}
                    >
                      <span className="text-secondary">
                        {s.station_name}
                      </span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-md"
                        style={{ color: sColor, background: `${sColor}1a` }}
                      >
                        {sAqi}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Language toggle */}
        <div className="flex gap-1 surface-subtle p-1 rounded-xl shrink-0">
          {(["en", "hi"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                language === lang
                  ? "text-white shadow-sm"
                  : "text-secondary hover:text-[var(--text-primary)]"
              }`}
              style={
                language === lang
                  ? { background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }
                  : undefined
              }
            >
              {lang === "en" ? "English" : "हिन्दी"}
            </button>
          ))}
        </div>
      </div>

      {/* AQI Hero */}
      <div
        className="card !p-0 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${color}12, ${color}06, transparent)`,
        }}
      >
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
          {/* Big AQI circle */}
          <div className="relative">
            <div
              className="flex flex-col items-center justify-center w-36 h-36 rounded-full"
              style={{
                background: `conic-gradient(${color} ${(aqi / 500) * 100}%, var(--bg-subtle) 0)`,
              }}
            >
              <div className="flex flex-col items-center justify-center w-[120px] h-[120px] rounded-full bg-[var(--bg-elevated)]">
                <span className="text-5xl font-bold" style={{ color }}>
                  {aqi}
                </span>
                <span className="text-[11px] text-muted mt-0.5">
                  {language === "en" ? "AQI" : "वायु गुणवत्ता"}
                </span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm text-muted mb-1">{strings.airQualityAt}</p>
            <h3 className="text-xl font-bold mb-1">{station.station_name}</h3>
            <p className="text-2xl font-bold mb-2" style={{ color }}>
              {localCategory}
            </p>
            <p className="text-sm text-secondary">{localDescription}</p>

            {/* Mini weather info (mock) */}
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <Thermometer size={13} />{" "}
                {language === "en" ? "34°C" : "34°से."}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <Droplets size={13} /> 62% {strings.humidity}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <Wind size={13} />{" "}
                {language === "en" ? "8 km/h NW" : "8 कि.मी./घंटा उ-प"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Day Forecast */}
      <div>
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
          {strings.forecast3Day}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {forecast.map((f, i) => {
            const localCat = strings.categories[f.category] || f.category;
            return (
              <div
                key={f.day}
                className="card !p-5 animate-slide-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted">{f.label}</span>
                  {f.trend === "up" ? (
                    <TrendingUp size={15} className="text-rose-500" />
                  ) : f.trend === "down" ? (
                    <TrendingDown size={15} className="text-emerald-500" />
                  ) : (
                    <Minus size={15} className="text-muted" />
                  )}
                </div>
                <p className="text-4xl font-bold" style={{ color: f.color }}>
                  {f.aqi}
                </p>
                <p
                  className="text-sm font-medium mt-1"
                  style={{ color: f.color }}
                >
                  {localCat}
                </p>
                <p className="text-[11px] text-muted mt-2">
                  {f.trend === "up"
                    ? strings.worsening
                    : f.trend === "down"
                    ? strings.improving
                    : strings.stable}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Health Advisory */}
      <div
        className="card"
        style={{
          borderColor: `${color}30`,
          background: `linear-gradient(135deg, ${color}08, transparent)`,
        }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <ShieldCheck size={20} style={{ color }} />
          <h3 className="font-semibold">{strings.healthAdvisory}</h3>
        </div>

        <p className="text-sm font-medium mb-4" style={{ color }}>
          {advisory.msg}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {advisory.tips.map((tip, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 surface-subtle p-3 rounded-xl animate-slide-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span
                className="flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold shrink-0 mt-0.5"
                style={{ background: `${color}18`, color }}
              >
                {i + 1}
              </span>
              <span className="text-sm text-secondary">{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pollutant levels */}
      <div className="card">
        <h3 className="card-header">{strings.pollutantLevels}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { name: "PM2.5", value: Math.round(aqi * 0.58), unit: "µg/m³", limit: 60 },
            { name: "PM10", value: Math.round(aqi * 1.1), unit: "µg/m³", limit: 100 },
            { name: "NO₂", value: Math.round(aqi * 0.18), unit: "ppb", limit: 80 },
            { name: "O₃", value: Math.round(aqi * 0.12), unit: "ppb", limit: 100 },
          ].map((p) => {
            const exceeds = p.value > p.limit;
            return (
              <div
                key={p.name}
                className="surface-subtle p-3.5 rounded-xl text-center"
              >
                <p className="text-xs text-muted mb-1">{p.name}</p>
                <p
                  className={`text-2xl font-bold ${
                    exceeds ? "text-rose-500" : ""
                  }`}
                  style={exceeds ? undefined : { color }}
                >
                  {p.value}
                </p>
                <p className="text-[10px] text-muted mt-0.5">{p.unit}</p>
                {exceeds && (
                  <p className="text-[10px] text-rose-400 mt-1">
                    {strings.aboveSafeLimit} ({p.limit})
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
