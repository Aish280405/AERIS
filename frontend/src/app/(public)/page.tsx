"use client";

import Link from "next/link";
import {
  Wind,
  BarChart3,
  PieChart,
  Shield,
  HeartPulse,
  MapPin,
  Brain,
  Globe,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: <BarChart3 size={22} />,
    title: "Predictive Forecasting",
    desc: "1–3 day AQI predictions at ~5km resolution using ML models trained on 72 features",
  },
  {
    icon: <PieChart size={22} />,
    title: "Source Attribution",
    desc: "SHAP-powered breakdown of pollution sources — traffic, industrial, fires, weather",
  },
  {
    icon: <Shield size={22} />,
    title: "Enforcement Intelligence",
    desc: "Prioritized action recommendations for where to deploy inspectors",
  },
  {
    icon: <HeartPulse size={22} />,
    title: "Health Advisories",
    desc: "Personalized alerts in Hindi & English based on your location's air quality",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen app-bg flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}
          >
            <Wind size={22} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">AERIS</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl text-sm font-medium text-secondary hover:text-[var(--text-primary)] transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="btn-primary px-4 py-2 text-sm"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full surface-subtle text-xs font-medium text-secondary">
            <Brain size={13} className="text-brand-400" />
            AI-Powered Air Quality Intelligence
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
            Breathe smarter with{" "}
            <span className="gradient-text">real-time AQI</span>{" "}
            intelligence
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-secondary max-w-xl mx-auto leading-relaxed">
            AERIS fuses monitoring data, satellite imagery, weather, and land-use to move Indian cities from reactive monitoring to proactive intervention.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/signup"
              className="btn-primary px-6 py-3 text-sm flex items-center gap-2"
            >
              Get Started <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 rounded-xl text-sm font-medium surface-subtle text-secondary hover:text-[var(--text-primary)] transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16 max-w-5xl w-full">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="card !p-5 text-left animate-slide-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl mb-3"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
              >
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold mb-1">{f.title}</h3>
              <p className="text-xs text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Data sources */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted mt-12 pb-8">
          <span className="flex items-center gap-1.5">
            <MapPin size={11} /> OpenAQ
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Globe size={11} /> Open-Meteo
          </span>
          <span>•</span>
          <span>NASA FIRMS</span>
          <span>•</span>
          <span>OpenStreetMap</span>
          <span>•</span>
          <span>CPCB Network</span>
        </div>
      </main>
    </div>
  );
}
