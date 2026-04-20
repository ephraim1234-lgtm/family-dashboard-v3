"use client";

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
      className="flex flex-wrap gap-2 rounded-[1.5rem] border border-base-300/70 bg-base-200/70 p-2"
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
            className={[
              "min-h-[44px] rounded-full px-4 text-sm font-medium transition",
              isActive
                ? "bg-base-100 text-base-content shadow-sm ring-1 ring-base-300"
                : "text-base-content/68 hover:bg-base-100/80 hover:text-base-content"
            ].join(" ")}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
