"use client";

import { useFoodHubContext } from "../food-hub-context";

export function FoodActionBar() {
  const {
    setAlertsOpen,
    setAddToListOpen,
    setAddToPantryOpen,
    handleQuickCook
  } = useFoodHubContext();

  return (
    <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center md:hidden" data-testid="food-action-bar">
      <div className="flex items-center gap-3 rounded-full border border-[color:var(--surface-line)] bg-[color:var(--surface-panel-strong)] px-3 py-2 shadow-xl backdrop-blur">
        <button
          aria-label="Cook"
          className="ui-button ui-button-ghost ui-button-sm ui-icon-button"
          title="Cook"
          type="button"
          onClick={handleQuickCook}
        >
          Cook
        </button>
        <button
          aria-label="Add to List"
          className="ui-button ui-button-ghost ui-button-sm ui-icon-button"
          title="Add to List"
          type="button"
          onClick={() => setAddToListOpen(true)}
        >
          List
        </button>
        <button
          aria-label="Add to Pantry"
          className="ui-button ui-button-ghost ui-button-sm ui-icon-button"
          title="Add to Pantry"
          type="button"
          onClick={() => setAddToPantryOpen(true)}
        >
          Pantry
        </button>
        <button
          aria-label="Alerts"
          className="ui-button ui-button-ghost ui-button-sm ui-icon-button"
          title="Alerts"
          type="button"
          onClick={() => setAlertsOpen(true)}
        >
          Alerts
        </button>
      </div>
    </div>
  );
}
