"use client";

import { cn } from "@/lib/cn";

type SubTabsProps<TTab extends string> = {
  tabs: Array<{ id: TTab; label: string }>;
  activeTab: TTab;
  onChange: (tab: TTab) => void;
  ariaLabel: string;
};

export function SubTabs<TTab extends string>({
  tabs,
  activeTab,
  onChange,
  ariaLabel
}: SubTabsProps<TTab>) {
  return (
    <div
      className="ui-subtabs"
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={cn("ui-subtab", isActive ? "ui-subtab-active" : null)}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
