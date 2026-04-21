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
        <label className="field">
          <span>Item</span>
          <input value={shoppingName} onChange={(event) => setShoppingName(event.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="field">
            <span>Qty</span>
            <input type="number" value={shoppingQuantity} onChange={(event) => setShoppingQuantity(event.target.value)} />
          </label>
          <label className="field">
            <span>Unit</span>
            <input value={shoppingUnit} onChange={(event) => setShoppingUnit(event.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Notes</span>
          <input value={shoppingNotes} onChange={(event) => setShoppingNotes(event.target.value)} />
        </label>
        {mergePreview?.willMerge ? <p className="text-sm opacity-70">This will merge into {mergePreview.existingItemName}.</p> : null}
        <button
          className="ui-button ui-button-primary ui-button-sm ui-button-block"
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
