"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  loadThemeChoice,
  resolveTheme,
  saveThemeChoice,
  systemPrefersDark,
  type ResolvedTheme,
  type ThemeChoice,
} from "@/lib/theme";

interface ThemeContextValue {
  theme: ThemeChoice;
  resolvedTheme: ResolvedTheme;
  setTheme: (next: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // "system" is a safe default for the very first client render: the inline
  // script in layout.tsx already applied the right `.dark` class before
  // paint, so this state only needs to catch up for the toggle UI itself,
  // not for what's visually shown -- no flash either way.
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    // Deferred to after mount for the same reason as the electorate-override
    // load: localStorage doesn't exist during SSR, so reading it during the
    // initial render would make this state disagree with the server-rendered
    // HTML. The visible page color never flashes either way -- the inline
    // script in layout.tsx already set the right `.dark` class before paint;
    // this only syncs the toggle UI's own state to match.
    const stored = loadThemeChoice();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(stored);
    setResolvedTheme(resolveTheme(stored));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setResolvedTheme(systemPrefersDark() ? "dark" : "light");
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [theme]);

  const setTheme = useCallback((next: ThemeChoice) => {
    saveThemeChoice(next);
    setThemeState(next);
    setResolvedTheme(resolveTheme(next));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

/** Drop-in replacement for the matchMedia-based hooks each chart used to
 * define locally -- now respects an explicit light/dark override too. */
export function useIsDark(): boolean {
  return useTheme().resolvedTheme === "dark";
}
