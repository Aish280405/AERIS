"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, Variants } from "framer-motion";
import { Wind, ArrowRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const IndiaGlobe = dynamic(() => import("@/components/IndiaGlobe"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
    </div>
  ),
});

// ─── Animation variants ──────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.08 } },
};

// ─── Component ───────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] overflow-x-hidden">
      {/* ═══ Background effects ═══ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(var(--border-strong) 1px, transparent 1px), linear-gradient(90deg, var(--border-strong) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />
        {/* Radial glow */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[var(--accent)] opacity-[0.04] blur-[150px]" />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] rounded-full bg-[var(--secondary)] opacity-[0.03] blur-[150px]" />
      </div>

      {/* ═══ Navbar ═══ */}
      <nav className="sticky top-0 z-50 glass">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <Wind size={16} className="text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">AERIS</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ Hero ═══ */}
      <section className="relative min-h-[calc(100vh-64px)] flex items-center">
        <div className="max-w-6xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 py-20">
          {/* Left */}
          <motion.div
            className="flex flex-col justify-center max-w-[560px]"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div custom={0} variants={fadeUp}>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--bg-subtle)] text-xs font-medium text-[var(--text-muted)] mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                Multi-Agent AI · Real-time Intelligence
              </span>
            </motion.div>

            <motion.h1
              custom={1}
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.12] mb-6"
            >
              Air quality intelligence{" "}
              <span className="gradient-text">that acts,</span> not just monitors
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed mb-8 max-w-[480px]"
            >
              AERIS fuses monitoring data, satellite imagery, and ML to give Indian cities the tools to reduce pollution at source — not just measure it.
            </motion.p>

            <motion.div custom={3} variants={fadeUp} className="flex items-center gap-3">
              <Link href="/signup" className="btn-primary flex items-center gap-2 px-6 py-3">
                Get Started <ArrowRight size={15} />
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 rounded-xl text-sm font-medium border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-all"
              >
                Sign In
              </Link>
            </motion.div>

            {/* Trust signals */}
            <motion.div custom={4} variants={fadeUp} className="flex items-center gap-6 mt-12 text-xs text-[var(--text-muted)]">
              <span>OpenAQ</span>
              <span className="opacity-30">·</span>
              <span>NASA FIRMS</span>
              <span className="opacity-30">·</span>
              <span>CPCB Network</span>
              <span className="opacity-30">·</span>
              <span>Open-Meteo</span>
            </motion.div>
          </motion.div>

          {/* Right — Globe */}
          <motion.div
            className="relative flex items-center justify-center lg:justify-end"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <IndiaGlobe />
          </motion.div>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <Wind size={14} className="text-[var(--accent)]" />
            <span className="font-medium text-[var(--text)]">AERIS</span>
            <span>· Urban AQI Intelligence</span>
          </div>
          <span>Built for India&apos;s air quality challenge</span>
        </div>
      </footer>
    </div>
  );
}
