"use client";

import { BottomDrawer } from "@/components/ui";
import { useFoodHubContext } from "../food-hub-context";

export function AddToListDrawer() {
  const {
    addToListOpen,
    setAddToListOpen,
    shoppingName,
    setShoppingName,
    shoppingQuantity,
    setShoppingQuantity,
    shoppingUnit,
    setShoppingUnit,
    shoppingNotes,
    setShoppingNotes,
    mergePreview,
    isPending,
    startTransition,
    setError,
    handleAddShoppingItem
  } = useFoodHubContext();

  return (
    <BottomDrawer open={addToListOpen} onClose={() => setAddToListOpen(false)} title="Add to Shopping List" testId="food-add-to-list-drawer">
      <div className="space-y-3">
        <label className="form-control">
          <span className="label-text">Item</span>
          <input className="input input-bordered min-h-[44px]" value={shoppingName} onChange={(event) => setShoppingName(event.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="form-control">
            <span className="label-text">Qty</span>
            <input className="input input-bordered min-h-[44px]" type="number" value={shoppingQuantity} onChange={(event) => setShoppingQuantity(event.target.value)} />
          </label>
          <label className="form-control">
            <span className="label-text">Unit</span>
            <input className="input input-bordered min-h-[44px]" value={shoppingUnit} onChange={(event) => setShoppingUnit(event.target.value)} />
          </label>
        </div>
        <label className="form-control">
          <span className="label-text">Notes</span>
          <input className="input input-bordered min-h-[44px]" value={shoppingNotes} onChange={(event) => setShoppingNotes(event.target.value)} />
        </label>
        {mergePreview?.willMerge ? <p className="text-sm opacity-70">This will merge into {mergePreview.existingItemName}.</p> : null}
        <button
          className="btn btn-primary w-full min-h-[44px]"
          disabled={isPending || !shoppingName.trim()}
          type="button"
          onClick={() => {
            setError(null);
            startTransition(() => {
              handleAddShoppingItem()
                .then(() => setAddToListOpen(false))
                .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to add shopping item."));
            });
          }}
        >
          Add to List
        </button>
      </div>
    </BottomDrawer>
  );
}
