"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MapDashboard from "@/components/MapDashboard";
import ForecastPanel from "@/components/ForecastPanel";
import AttributionPanel from "@/components/AttributionPanel";
import EnforcementPanel from "@/components/EnforcementPanel";
import AdvisoryPanel from "@/components/AdvisoryPanel";
import AIAssistant from "@/components/AIAssistant";
import CitizenDashboard from "@/components/CitizenDashboard";
import type { View } from "@/lib/types";

export type { View };

const viewTitles: Record<View, { title: string; subtitle: string }> = {
  map: {
    title: "Map Dashboard",
    subtitle: "Real-time air quality across Delhi",
  },
  forecast: { title: "AQI Forecast", subtitle: "1–3 day PM2.5 predictions" },
  attribution: {
    title: "Source Attribution",
    subtitle: "What's polluting this location",
  },
  enforcement: {
    title: "Enforcement Intelligence",
    subtitle: "Where to deploy inspectors",
  },
  advisory: {
    title: "Health Advisory",
    subtitle: "Citizen alerts & guidance",
  },
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [activeView, setActiveView] = useState<View>("map");
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  if (status === "unauthenticated") {
    redirect("/login");
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted">Loading AERIS…</p>
        </div>
      </div>
    );
  }

  const userRole = session?.user?.role || "citizen";
  const isAuthority = userRole === "authority";

  // ═══════════════════════════════════════════
  // CITIZEN VIEW
  // ═══════════════════════════════════════════
  if (!isAuthority) {
    return (
      <div className="app-bg min-h-screen">
        <header className="glass border-b sticky top-0 z-30">
          <div className="max-w-4xl mx-auto flex items-center justify-between px-6 h-16">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-9 h-9 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                }}
              >
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight">AERIS</h1>
                <p className="text-[10px] text-muted">
                  Your Air Quality Companion
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setAssistantOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white transition-all hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                Ask AI
              </button>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-2 px-3 py-2 rounded-xl surface-subtle text-xs text-secondary hover:text-[var(--text-primary)] transition-colors"
              >
                {session?.user?.name?.split(" ")[0] || "User"}
                <span className="text-muted">·</span>
                <span className="text-rose-400">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-6">
          <CitizenDashboard />
        </main>

        <AIAssistant
          open={assistantOpen}
          onClose={() => setAssistantOpen(false)}
          context={{ view: "advisory", station: null }}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // AUTHORITY VIEW
  // ═══════════════════════════════════════════
  const renderView = () => {
    switch (activeView) {
      case "map":
        return (
          <MapDashboard
            onStationSelect={setSelectedStation}
            selectedStation={selectedStation}
          />
        );
      case "forecast":
        return <ForecastPanel stationId={selectedStation} />;
      case "attribution":
        return <AttributionPanel stationId={selectedStation} />;
      case "enforcement":
        return <EnforcementPanel />;
      case "advisory":
        return <AdvisoryPanel stationId={selectedStation} />;
    }
  };

  return (
    <div className="app-bg flex h-screen overflow-hidden">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        userRole={userRole}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          title={viewTitles[activeView].title}
          subtitle={viewTitles[activeView].subtitle}
          onOpenAssistant={() => setAssistantOpen(true)}
          assistantOpen={assistantOpen}
          user={session?.user}
          onSignOut={() => signOut({ callbackUrl: "/login" })}
        />
        <main
          key={activeView}
          className="flex-1 overflow-auto p-6 animate-fade-in"
        >
          {renderView()}
        </main>
      </div>

      <AIAssistant
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        context={{ view: activeView, station: selectedStation }}
      />

      {!assistantOpen && (
        <button
          onClick={() => setAssistantOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 pl-4 pr-5 py-3.5 rounded-2xl text-white font-medium shadow-2xl transition-all duration-300 hover:scale-105 animate-float"
          style={{
            background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
            boxShadow: "0 10px 40px rgba(8, 145, 178, 0.5)",
          }}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          Ask AERIS AI
        </button>
      )}
    </div>
  );
}
