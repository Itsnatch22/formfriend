"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={resolvedTheme ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Change color theme"}
      title={resolvedTheme ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Change color theme"}
      disabled={!resolvedTheme}
      aria-pressed={isDark}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span>{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
