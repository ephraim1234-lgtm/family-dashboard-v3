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
    <details className="collapse collapse-arrow rounded-box border border-base-300 bg-base-100" open>
      <summary className="collapse-title text-base font-medium">
        {title} ({items.length})
      </summary>
      <div className="collapse-content space-y-2">
        {items.length === 0 ? <p className="text-sm opacity-70">Nothing here right now.</p> : null}
        {items.map((item) => (
          <div className="flex items-center justify-between gap-3 rounded-box border border-base-300 p-3" key={item.id}>
            <span>{item.label}</span>
            <button className="btn btn-sm min-h-[44px]" type="button" onClick={item.onAction}>
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
        <Section title="Expiring soon" items={expiringAlertItems} />
        <Section title="Shopping needs review" items={needsReviewAlertItems} />
        <Section title="Meals missing ingredients" items={missingMealAlertItems} />
      </div>
    </BottomDrawer>
  );
}
