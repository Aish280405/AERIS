"use client";

import { useState } from "react";
import { Moon, Sun, Sparkles, Search, Bell, LogOut, User, Shield } from "lucide-react";
import { useTheme } from "@/lib/theme";

interface TopBarProps {
  title: string;
  subtitle: string;
  onOpenAssistant: () => void;
  assistantOpen: boolean;
  user?: { name?: string | null; email?: string | null; role?: string } | null;
  onSignOut?: () => void;
}

export default function TopBar({
  title,
  subtitle,
  onOpenAssistant,
  assistantOpen,
  user,
  onSignOut,
}: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <header className="flex items-center justify-between px-6 h-[73px] border-b glass shrink-0">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="text-xs text-muted">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 surface-subtle px-3 py-2 w-56">
          <Search size={15} className="text-muted shrink-0" />
          <input
            placeholder="Search stations, wards…"
            className="bg-transparent text-sm outline-none w-full placeholder:text-muted"
          />
        </div>

        {/* Notifications */}
        <button className="relative flex items-center justify-center w-10 h-10 rounded-xl surface-subtle transition-colors hover:border-strong">
          <Bell size={17} className="text-secondary" />
          <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-rose-500" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="relative flex items-center justify-center w-10 h-10 rounded-xl surface-subtle transition-colors hover:border-strong overflow-hidden"
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
        >
          <Sun
            size={17}
            className={`absolute text-amber-500 transition-all duration-300 ${
              theme === "dark"
                ? "opacity-0 rotate-90 scale-0"
                : "opacity-100 rotate-0 scale-100"
            }`}
          />
          <Moon
            size={17}
            className={`absolute text-brand-300 transition-all duration-300 ${
              theme === "dark"
                ? "opacity-100 rotate-0 scale-100"
                : "opacity-0 -rotate-90 scale-0"
            }`}
          />
        </button>

        {/* AI assistant */}
        <button
          onClick={onOpenAssistant}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 ${
            assistantOpen ? "opacity-60" : "hover:scale-105"
          }`}
          style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}
        >
          <Sparkles size={16} />
          <span className="hidden sm:inline">AI Agent</span>
        </button>

        {/* User profile */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl surface-subtle transition-colors hover:border-strong"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-brand-500/15 text-brand-400">
                {user.role === "authority" ? (
                  <Shield size={14} />
                ) : (
                  <User size={14} />
                )}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-medium leading-tight">
                  {user.name || "User"}
                </p>
                <p className="text-[10px] text-muted capitalize">
                  {user.role || "citizen"}
                </p>
              </div>
            </button>

            {/* Dropdown */}
            {showProfile && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfile(false)}
                />
                <div className="absolute right-0 top-12 z-50 w-56 surface p-2 shadow-xl animate-slide-up">
                  <div className="px-3 py-2 border-b mb-2">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted">{user.email}</p>
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-brand-500/10 text-brand-400">
                      {user.role === "authority" ? (
                        <Shield size={10} />
                      ) : (
                        <User size={10} />
                      )}
                      {user.role}
                    </span>
                  </div>
                  <button
                    onClick={onSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
