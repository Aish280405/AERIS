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
  Zap,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const features = [
  {
    icon: <BarChart3 size={20} />,
    title: "Predictive Forecasting",
    desc: "1–3 day AQI predictions at ~5km resolution using ML models trained on 72 features",
  },
  {
    icon: <PieChart size={20} />,
    title: "Source Attribution",
    desc: "SHAP-powered breakdown — traffic, industrial, fires, weather — with confidence scores",
  },
  {
    icon: <Shield size={20} />,
    title: "Enforcement Intelligence",
    desc: "Prioritized, evidence-backed recommendations for inspector deployment",
  },
  {
    icon: <HeartPulse size={20} />,
    title: "Health Advisories",
    desc: "LLM-generated personalized alerts in Hindi & English based on your area",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen app-bg flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-12 py-5 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--accent)]">
            <Wind size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">AERIS</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-sm font-medium text-secondary hover:text-[var(--text-primary)] transition-colors"
          >
            Sign In
          </Link>
          <Link href="/signup" className="btn-primary">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-7xl mx-auto w-full">
        <div className="max-w-2xl mx-auto space-y-6 py-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full surface-subtle text-xs font-medium text-secondary">
            <Zap size={12} className="text-[var(--accent)]" />
            Multi-Agent AI System • Real-time Intelligence
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.15]">
            Air quality intelligence{" "}
            <span className="gradient-text">that acts,</span>{" "}
            not just monitors
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-secondary max-w-lg mx-auto leading-relaxed">
            AERIS fuses monitoring data, satellite imagery, and ML to give Indian cities the tools to reduce pollution at source — not just measure it.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Link
              href="/signup"
              className="btn-primary px-6 py-3 flex items-center gap-2"
            >
              Get Started <ArrowRight size={15} />
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 rounded-xl text-sm font-medium surface text-secondary hover:text-[var(--text-primary)] transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl pb-8">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="card !p-5 text-left animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div
                className="flex items-center justify-center w-9 h-9 rounded-lg mb-3"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
              >
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
              <p className="text-xs text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Data sources */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted mt-8 pb-10">
          <span className="flex items-center gap-1.5">
            <MapPin size={11} /> OpenAQ
          </span>
          <span className="opacity-30">•</span>
          <span className="flex items-center gap-1.5">
            <Globe size={11} /> Open-Meteo
          </span>
          <span className="opacity-30">•</span>
          <span>NASA FIRMS</span>
          <span className="opacity-30">•</span>
          <span>OpenStreetMap</span>
          <span className="opacity-30">•</span>
          <span>CPCB Network</span>
        </div>
      </main>
    </div>
  );
}
