"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "householdops:theme";

export const AVAILABLE_THEMES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "cupcake", label: "Cupcake" },
  { id: "retro", label: "Retro" },
  { id: "forest", label: "Forest" },
  { id: "night", label: "Night" }
] as const;

export type ThemeId = (typeof AVAILABLE_THEMES)[number]["id"];

const FALLBACK_THEME: ThemeId = "light";

function isThemeId(value: string | null): value is ThemeId {
  return AVAILABLE_THEMES.some((theme) => theme.id === value);
}

function applyTheme(theme: ThemeId) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(FALLBACK_THEME);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(STORAGE_KEY);
      if (isThemeId(storedTheme)) {
        setThemeState(storedTheme);
        applyTheme(storedTheme);
        return;
      }
    } catch {
      // Ignore storage read failures and keep the fallback theme.
    }

    applyTheme(FALLBACK_THEME);
  }, []);

  const themes = useMemo(() => [...AVAILABLE_THEMES], []);

  function setTheme(nextTheme: ThemeId) {
    setThemeState(nextTheme);
    applyTheme(nextTheme);

    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // Ignore storage write failures and keep the DOM state in sync.
    }
  }

  return {
    theme,
    setTheme,
    themes
  };
}
