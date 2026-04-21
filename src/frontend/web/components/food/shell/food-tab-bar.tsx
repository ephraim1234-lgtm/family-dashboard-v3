"use client";

import { useFoodHubContext } from "../food-hub-context";

const TABS = [
  { id: "home", label: "Home" },
  { id: "recipes", label: "Recipes" },
  { id: "planning", label: "Meals" },
  { id: "pantry", label: "Pantry" },
  { id: "shopping", label: "Shopping" }
] as const;

export function FoodTabBar() {
  const { activeModuleTab, setActiveModuleTab } = useFoodHubContext();

  return (
    <nav
      aria-label="Food tabs"
      className="sticky top-2 z-40"
      data-testid="food-tab-bar"
    >
      <div
        className="mx-auto flex w-full max-w-5xl gap-2 overflow-x-auto rounded-[1.5rem] border border-[color:var(--surface-line)] bg-[color:var(--surface-panel)] p-2 shadow-sm backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Food tabs"
      >
        {TABS.map((tab) => {
          const isActive = activeModuleTab === tab.id;

          return (
            <button
              key={tab.id}
              className={[
                "min-h-[44px] shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-[color:var(--text-strong)] text-white shadow-sm"
                  : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text-strong)]"
              ].join(" ")}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              type="button"
              onClick={() => setActiveModuleTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
