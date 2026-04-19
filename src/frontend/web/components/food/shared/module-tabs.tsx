"use client";

type ModuleTabsProps<TTab extends string> = {
  tabs: Array<{ id: TTab; label: string }>;
  activeTab: TTab;
  onChange: (tab: TTab) => void;
};

export function ModuleTabs<TTab extends string>({ tabs, activeTab, onChange }: ModuleTabsProps<TTab>) {
  return (
    <div className="food-tab-row">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={tab.id === activeTab ? "food-tab-button food-tab-button-active" : "food-tab-button"}
          type="button"
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
