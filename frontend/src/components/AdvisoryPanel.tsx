"use client";

import { useState } from "react";
import { HeartPulse, Wind, ShieldCheck, Languages } from "lucide-react";
import { useStations } from "@/lib/data";
import { getAqiColor, getAqiCategory, mockAqiForStation } from "@/lib/aqi";

interface AdvisoryPanelProps {
  stationId: string | null;
}

const advisories: Record<
  string,
  Record<string, { message: string; precautions: string[] }>
> = {
  en: {
    Good: { message: "Air quality is good. Enjoy outdoor activities.", precautions: ["No special precautions needed"] },
    Satisfactory: { message: "Air quality is satisfactory.", precautions: ["Unusually sensitive people should watch for symptoms"] },
    Moderate: {
      message: "Air quality is moderate. Sensitive groups should limit prolonged outdoor exertion.",
      precautions: ["Sensitive individuals reduce outdoor activity", "Keep windows closed during peak traffic"],
    },
    Poor: {
      message: "Air quality is poor. Reduce outdoor activities.",
      precautions: ["Avoid prolonged outdoor exertion", "Use N95 masks outdoors", "Keep windows and doors closed", "Use air purifiers if available"],
    },
    "Very Poor": {
      message: "Air quality is very poor. Stay indoors if possible.",
      precautions: ["Avoid all outdoor physical activity", "Wear N95 mask if going outside", "Seal windows and doors", "Run air purifiers continuously", "Seek medical attention if breathing difficulty"],
    },
    Severe: {
      message: "HEALTH EMERGENCY. Air quality is severe. Do not go outdoors.",
      precautions: ["STAY INDOORS — do not go outside", "Seal windows and doors", "Run air purifiers at maximum", "Avoid all physical exertion", "Seek immediate medical help for respiratory distress", "Schools and outdoor work should be suspended"],
    },
  },
  hi: {
    Good: { message: "हवा की गुणवत्ता अच्छी है। बाहरी गतिविधियों का आनंद लें।", precautions: ["कोई विशेष सावधानी की आवश्यकता नहीं"] },
    Satisfactory: { message: "हवा की गुणवत्ता संतोषजनक है।", precautions: ["अत्यधिक संवेदनशील लोग लक्षणों पर ध्यान दें"] },
    Moderate: {
      message: "हवा की गुणवत्ता मध्यम है। संवेदनशील लोग बाहरी गतिविधि सीमित करें।",
      precautions: ["संवेदनशील व्यक्ति बाहरी गतिविधि कम करें", "पीक ट्रैफिक के समय खिड़कियां बंद रखें"],
    },
    Poor: {
      message: "हवा की गुणवत्ता खराब है। बाहरी गतिविधियां कम करें।",
      precautions: ["लंबे समय तक बाहर रहने से बचें", "बाहर N95 मास्क पहनें", "खिड़कियां और दरवाजे बंद रखें", "एयर प्यूरीफायर का उपयोग करें"],
    },
    "Very Poor": {
      message: "हवा की गुणवत्ता बहुत खराब है। जितना हो सके घर के अंदर रहें।",
      precautions: ["बाहर किसी भी शारीरिक गतिविधि से बचें", "बाहर जाना जरूरी हो तो N95 मास्क पहनें", "सभी खिड़कियां सील करें", "एयर प्यूरीफायर लगातार चलाएं", "सांस लेने में तकलीफ हो तो डॉक्टर से मिलें"],
    },
    Severe: {
      message: "स्वास्थ्य आपातकाल। हवा की गुणवत्ता गंभीर है। बाहर न जाएं।",
      precautions: ["घर के अंदर रहें — बाहर न जाएं", "खिड़कियां और दरवाजे सील करें", "एयर प्यूरीफायर अधिकतम पर चलाएं", "किसी भी शारीरिक परिश्रम से बचें", "सांस की तकलीफ पर तुरंत चिकित्सा सहायता लें", "स्कूल और बाहरी काम बंद होने चाहिए"],
    },
  },
};

export default function AdvisoryPanel({ stationId }: AdvisoryPanelProps) {
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const stations = useStations();
  const station = stations.find((s) => s.station_id === stationId);

  const aqi = stationId ? mockAqiForStation(stationId) : 280;
  const category = getAqiCategory(aqi);
  const color = getAqiColor(category);
  const advisory = advisories[language][category];

  return (
    <div className="h-full flex flex-col gap-5 animate-fade-in">
      {/* Language toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Languages size={16} />
          {language === "en" ? "Language" : "भाषा"}
        </div>
        <div className="flex gap-1 surface-subtle p-1">
          {(["en", "hi"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                language === lang ? "text-white" : "text-secondary"
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

      {/* AQI hero */}
      <div
        className="card !p-6 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}18, transparent)` }}
      >
        <div className="flex items-center gap-5">
          <div
            className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl shrink-0"
            style={{ background: `${color}1a`, border: `2px solid ${color}40` }}
          >
            <span className="text-4xl font-bold" style={{ color }}>
              {aqi}
            </span>
            <span className="text-[10px] text-muted">AQI</span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted mb-1">
              {station?.station_name || "Delhi (city average)"}
            </p>
            <p className="text-2xl font-bold mb-1" style={{ color }}>
              {category}
            </p>
            <p className="text-sm text-secondary">{advisory.message}</p>
          </div>
        </div>
      </div>

      {/* Precautions */}
      <div className="card">
        <h3 className="card-header flex items-center gap-2">
          <ShieldCheck size={18} className="text-brand-400" />
          {language === "en" ? "Recommended Precautions" : "अनुशंसित सावधानियां"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {advisory.precautions.map((p, i) => (
            <div
              key={i}
              className="surface-subtle p-3.5 flex items-start gap-2.5 animate-slide-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span
                className="flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold shrink-0 mt-0.5"
                style={{ background: `${color}1a`, color }}
              >
                {i + 1}
              </span>
              <span className="text-sm text-secondary">{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="card !p-4 flex items-start gap-3">
        <Wind size={16} className="text-brand-400 mt-0.5 shrink-0" />
        <p className="text-xs text-secondary leading-relaxed">
          {language === "en"
            ? "Advisories follow CPCB National Air Quality Index guidelines. LLM-generated, personalized advisories (by age group, activity, and health condition) will be available once the advisory agent is connected."
            : "सलाह CPCB राष्ट्रीय वायु गुणवत्ता सूचकांक दिशानिर्देशों का पालन करती है। एडवाइजरी एजेंट के जुड़ने के बाद व्यक्तिगत सलाह उपलब्ध होगी।"}
        </p>
      </div>
    </div>
  );
}
