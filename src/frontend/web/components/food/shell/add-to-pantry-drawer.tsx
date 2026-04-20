"use client";

import { BottomDrawer, SegmentedToggle } from "@/components/ui";
import { useFoodHubContext } from "../food-hub-context";

export function AddToPantryDrawer() {
  const {
    addToPantryOpen,
    setAddToPantryOpen,
    pantryName,
    setPantryName,
    quickPantryLocationId,
    setQuickPantryLocationId,
    quickPantryLocationOptions,
    isPending,
    startTransition,
    setError,
    handleQuickAddPantryItem
  } = useFoodHubContext();

  return (
    <BottomDrawer open={addToPantryOpen} onClose={() => setAddToPantryOpen(false)} title="Add to Pantry" testId="food-add-to-pantry-drawer">
      <div className="space-y-4">
        <label className="form-control">
          <span className="label-text">Item</span>
          <input className="input input-bordered min-h-[44px]" value={pantryName} onChange={(event) => setPantryName(event.target.value)} />
        </label>
        <SegmentedToggle
          value={quickPantryLocationId}
          options={quickPantryLocationOptions}
          onChange={setQuickPantryLocationId}
          testId="food-pantry-location-toggle"
        />
        <button
          className="btn btn-primary w-full min-h-[44px]"
          disabled={isPending || !pantryName.trim()}
          type="button"
          onClick={() => {
            setError(null);
            startTransition(() => {
              handleQuickAddPantryItem()
                .then(() => setAddToPantryOpen(false))
                .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to add pantry item."));
            });
          }}
        >
          Add to Pantry
        </button>
      </div>
    </BottomDrawer>
  );
}
