"use client";

import { BottomDrawer } from "@/components/ui";
import { useFoodHubContext } from "../food-hub-context";

function Section({
  title,
  items
}: {
  title: string;
  items: Array<{ id: string; label: string; actionLabel: string; onAction: () => void }>;
}) {
  return (
    <details className="ui-disclosure" open>
      <summary className="ui-disclosure-summary text-base font-medium">
        {title} ({items.length})
      </summary>
      <div className="ui-disclosure-body space-y-2">
        {items.length === 0 ? <p className="text-sm opacity-70">Nothing here right now.</p> : null}
        {items.map((item) => (
          <div className="ui-inline-card flex items-center justify-between gap-3" key={item.id}>
            <span>{item.label}</span>
            <button className="ui-button ui-button-sm" type="button" onClick={item.onAction}>
              {item.actionLabel}
            </button>
          </div>
        ))}
      </div>
    </details>
  );
}

export function AlertsPanel() {
  const {
    alertsOpen,
    setAlertsOpen,
    lowStockAlertItems,
    expiringAlertItems,
    needsReviewAlertItems,
    missingMealAlertItems
  } = useFoodHubContext();

  return (
    <BottomDrawer open={alertsOpen} onClose={() => setAlertsOpen(false)} title="Alerts" testId="food-alerts-panel">
      <div className="space-y-3">
        <Section title="Low stock" items={lowStockAlertItems} />
        <Section title="Expiring / expired" items={expiringAlertItems} />
        <Section title="Shopping needs review" items={needsReviewAlertItems} />
        <Section title="Meals missing ingredients" items={missingMealAlertItems} />
      </div>
    </BottomDrawer>
  );
}
