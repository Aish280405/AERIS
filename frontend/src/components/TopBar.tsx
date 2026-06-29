"use client";

import { useState } from "react";
import { Sparkles, Search, Bell, LogOut, User, Shield } from "lucide-react";
import { useLanguage } from "@/lib/language";
import ThemeToggle from "@/components/ThemeToggle";

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
  const { language, setLanguage, t } = useLanguage();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <header className="flex items-center justify-between px-6 h-[73px] border-b glass shrink-0">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="text-xs text-muted">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 surface-subtle px-3 py-2 w-52">
          <Search size={15} className="text-muted shrink-0" />
          <input
            placeholder={language === "en" ? "Search stations…" : "स्टेशन खोजें…"}
            className="bg-transparent text-sm outline-none w-full placeholder:text-muted"
          />
        </div>

        {/* Language toggle */}
        <div className="flex items-center surface-subtle rounded-lg overflow-hidden">
          <button
            onClick={() => setLanguage("en")}
            className={`px-2.5 py-2 text-xs font-medium transition-all ${
              language === "en" ? "text-white bg-[var(--accent)]" : "text-secondary hover:text-[var(--text-primary)]"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage("hi")}
            className={`px-2.5 py-2 text-xs font-medium transition-all ${
              language === "hi" ? "text-white bg-[var(--accent)]" : "text-secondary hover:text-[var(--text-primary)]"
            }`}
          >
            हि
          </button>
        </div>

        {/* Notifications */}
        <button className="relative flex items-center justify-center w-9 h-9 rounded-lg surface-subtle transition-colors">
          <Bell size={16} className="text-secondary" />
          <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-rose-500" />
        </button>

        {/* Theme toggle — shared component */}
        <ThemeToggle />

        {/* AI assistant */}
        <button
          onClick={onOpenAssistant}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium text-white bg-[var(--accent)] transition-all duration-200 ${
            assistantOpen ? "opacity-60" : "hover:bg-[var(--accent-hover)]"
          }`}
        >
          <Sparkles size={15} />
          <span className="hidden sm:inline">{t.askAI}</span>
        </button>

        {/* User profile */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg surface-subtle transition-colors"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">
                {user.role === "authority" ? <Shield size={12} /> : <User size={12} />}
              </div>
              <span className="hidden lg:block text-xs font-medium">
                {user.name || "User"}
              </span>
            </button>

            {showProfile && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                <div className="absolute right-0 top-12 z-50 w-52 surface p-2 shadow-xl animate-slide-up">
                  <div className="px-3 py-2 border-b mb-2">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted">{user.email}</p>
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[var(--accent-soft)] text-[var(--accent)]">
                      {user.role === "authority" ? <Shield size={9} /> : <User size={9} />}
                      {user.role}
                    </span>
                  </div>
                  <button
                    onClick={onSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut size={14} />
                    {t.signOut}
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
