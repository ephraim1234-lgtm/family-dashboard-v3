"use client";

import { useId } from "react";
import { useTheme } from "./use-theme";

export function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();
  const selectId = useId();

  return (
    <div className="space-y-2">
      <label className="sr-only" htmlFor={selectId}>
        Choose theme
      </label>
      <select
        id={selectId}
        aria-label="Choose theme"
        className="select select-bordered w-full min-h-[48px] rounded-2xl border-base-300/70 bg-base-100"
        value={theme}
        onChange={(event) => setTheme(event.target.value as (typeof themes)[number]["id"])}
      >
        {themes.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
