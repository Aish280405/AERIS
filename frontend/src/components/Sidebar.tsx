"use client";

import {
  Map,
  BarChart3,
  PieChart,
  Shield,
  HeartPulse,
  Wind,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import type { View } from "@/lib/types";
import type { UserRole } from "@/lib/types";
import { useLanguage } from "@/lib/language";

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  userRole: UserRole;
}

const navItems: {
  id: View;
  labelKey: "mapDashboard" | "forecasts" | "sourceAttribution" | "enforcement" | "healthAdvisory";
  icon: React.ReactNode;
  badge?: string;
  authorityOnly?: boolean;
}[] = [
  { id: "map", labelKey: "mapDashboard", icon: <Map size={19} /> },
  { id: "forecast", labelKey: "forecasts", icon: <BarChart3 size={19} /> },
  { id: "attribution", labelKey: "sourceAttribution", icon: <PieChart size={19} /> },
  { id: "enforcement", labelKey: "enforcement", icon: <Shield size={19} />, badge: "5", authorityOnly: true },
  { id: "advisory", labelKey: "healthAdvisory", icon: <HeartPulse size={19} /> },
];

export default function Sidebar({
  activeView,
  onViewChange,
  collapsed,
  onToggleCollapse,
  userRole,
}: SidebarProps) {
  const { t } = useLanguage();

  return (
    <aside
      className="relative flex flex-col glass border-r transition-all duration-300"
      style={{ width: collapsed ? "76px" : "260px" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-[73px] border-b shrink-0">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 bg-[var(--accent)]"
        >
          <Wind size={22} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold leading-tight tracking-tight">
              AERIS
            </h1>
            <p className="text-[11px] text-muted leading-tight whitespace-nowrap">
              AQI Intelligence
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
            {t.platform}
          </p>
        )}
        {navItems
          .filter((item) => !item.authorityOnly || userRole === "authority")
          .map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              title={collapsed ? t[item.labelKey] : undefined}
              className={`nav-item ${active ? "nav-item-active" : ""} ${
                collapsed ? "justify-center" : ""
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left whitespace-nowrap">
                    {t[item.labelKey]}
                  </span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/15 text-rose-500">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* AI hint card */}
      {!collapsed && (
        <div className="p-3">
          <div
            className="surface-subtle p-3.5 relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(59,130,246,0.12))",
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={15} className="text-brand-400" />
              <span className="text-xs font-semibold">AERIS AI Agent</span>
            </div>
            <p className="text-[11px] text-secondary leading-relaxed">
              Ask about pollution sources, forecasts, or enforcement actions.
            </p>
          </div>
        </div>
      )}

      {/* Status footer */}
      <div className="p-3 border-t shrink-0">
        <div
          className={`flex items-center gap-2.5 ${
            collapsed ? "justify-center" : "px-2"
          }`}
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-xs font-medium whitespace-nowrap">
                Delhi · 30 stations
              </p>
              <p className="text-[10px] text-muted whitespace-nowrap">
                Live · updated now
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 z-10 flex items-center justify-center w-6 h-6 rounded-full surface shadow-md transition-transform hover:scale-110"
        title={collapsed ? "Expand" : "Collapse"}
      >
        <ChevronLeft
          size={14}
          className={`transition-transform duration-300 ${
            collapsed ? "rotate-180" : ""
          }`}
        />
      </button>
    </aside>
  );
}
