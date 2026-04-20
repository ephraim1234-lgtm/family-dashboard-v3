"use client";

import { useFoodHubContext } from "../food-hub-context";

const TABS = [
  { id: "home", label: "Home" },
  { id: "recipes", label: "Recipes" },
  { id: "planning", label: "Planning" },
  { id: "pantry", label: "Pantry" },
  { id: "shopping", label: "Shopping" }
] as const;

export function FoodTabBar() {
  const { activeModuleTab, setActiveModuleTab } = useFoodHubContext();

  return (
    <nav
      aria-label="Food tabs"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-base-300 bg-base-100/95 backdrop-blur md:sticky md:top-0 md:bottom-auto md:rounded-box md:border md:bg-base-100"
      data-testid="food-tab-bar"
    >
      <div className="tabs tabs-boxed mx-auto grid w-full max-w-5xl grid-cols-5 bg-transparent p-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab min-h-[44px] ${activeModuleTab === tab.id ? "tab-active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setActiveModuleTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
