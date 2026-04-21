"use client";

import { SegmentedToggle } from "@/components/ui";

export function PostPurchaseConfirm({
  open,
  items,
  locationOptions,
  selectedLocations,
  onLocationChange,
  onClose,
  onConfirm,
  isPending
}: {
  open: boolean;
  items: Array<{ id: string; ingredientName: string; conflictLabel?: string | null }>;
  locationOptions: Array<{ label: string; value: string }>;
  selectedLocations: Record<string, string>;
  onLocationChange: (itemId: string, locationId: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal modal-open" data-testid="food-post-purchase-confirm">
      <div className="modal-box max-w-3xl">
        <h3 className="text-lg font-semibold">Add purchased items to pantry</h3>
        <p className="mt-2 text-sm opacity-75">
          Purchased items are added to pantry in one pass after you confirm the destination for each line.
        </p>
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div className="rounded-box border border-base-300 p-3" key={item.id}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <strong>{item.ingredientName}</strong>
                {item.conflictLabel ? <span className="badge badge-warning">{item.conflictLabel}</span> : null}
              </div>
              <SegmentedToggle
                value={selectedLocations[item.id] ?? locationOptions[0]?.value ?? ""}
                options={locationOptions}
                onChange={(value) => onLocationChange(item.id, value)}
              />
            </div>
          ))}
        </div>
        <div className="modal-action">
          <button className="btn btn-ghost min-h-[44px]" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary min-h-[44px]" type="button" disabled={isPending} onClick={onConfirm}>
            Add to Pantry
          </button>
        </div>
      </div>
    </div>
  );
}
