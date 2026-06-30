"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

interface ThemeToggleProps {
  size?: number;
}

export default function ThemeToggle({ size = 15 }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-inset)] transition-all duration-200 overflow-hidden"
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
      aria-label="Toggle theme"
    >
      <Sun
        size={size}
        className={`absolute text-amber-500 transition-all duration-300 ${
          theme === "dark"
            ? "opacity-0 rotate-90 scale-0"
            : "opacity-100 rotate-0 scale-100"
        }`}
      />
      <Moon
        size={size}
        className={`absolute text-[var(--accent)] transition-all duration-300 ${
          theme === "dark"
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 -rotate-90 scale-0"
        }`}
      />
    </button>
  );
}
