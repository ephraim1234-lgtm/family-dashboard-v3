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
    <div className="sub-tab-row" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={isActive ? "sub-tab-button sub-tab-button-active" : "sub-tab-button"}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
