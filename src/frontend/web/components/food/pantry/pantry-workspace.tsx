"use client";

import { SegmentedToggle } from "@/components/ui";
import { useFoodHubContext } from "../food-hub-context";

export function PantryWorkspace() {
  const {
    data,
    filteredPantryItems,
    pantrySearch,
    setPantrySearch,
    pantryLocationFilter,
    setPantryLocationFilter,
    pantryLowStockOnly,
    setPantryLowStockOnly,
    setSelectedPantryItemId,
    selectedPantryItem,
    pantryHistory,
    pantryEditLocationId,
    setPantryEditLocationId,
    pantryEditStatus,
    setPantryEditStatus,
    pantryEditQuantity,
    setPantryEditQuantity,
    pantryEditUnit,
    setPantryEditUnit,
    pantryEditLowThreshold,
    setPantryEditLowThreshold,
    pantryEditPurchasedAt,
    setPantryEditPurchasedAt,
    pantryEditExpiresAt,
    setPantryEditExpiresAt,
    pantryEditNote,
    setPantryEditNote,
    handleUpdatePantryItem,
    handleUndoableDeletePantryItem,
    isPending,
    setError,
    startTransition,
    formatQuantity,
    formatTimestamp
  } = useFoodHubContext();

  return (
    <section className="grid gap-4">
      <article className="panel" data-testid="food-pantry-panel">
        <div className="eyebrow">Pantry</div>
        <h2>Track inventory by location and low-stock status</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SegmentedToggle
            value={pantryLocationFilter}
            options={[
              { label: "All", value: "all" },
              { label: "Pantry", value: "pantry" },
              { label: "Fridge", value: "fridge" },
              { label: "Freezer", value: "freezer" }
            ]}
            onChange={setPantryLocationFilter}
            testId="food-pantry-location-tabs"
          />
          <button
            className={`ui-button ui-button-sm ${pantryLowStockOnly ? "ui-button-active" : "ui-button-ghost"}`}
            type="button"
            onClick={() => setPantryLowStockOnly((current: boolean) => !current)}
          >
            Low Stock
          </button>
        </div>
        <div className="field mt-4">
          <span>Search</span>
          <input
            aria-label="Pantry search"
            value={pantrySearch}
            onChange={(event) => setPantrySearch(event.target.value)}
            placeholder="Search pantry items"
          />
        </div>

        <div className="stack-list mt-4">
          {filteredPantryItems.map((item: any) => (
            <div className="stack-card food-row-shell" data-testid={`food-pantry-item-${item.id}`} key={item.id}>
              <div className="stack-card-header">
                <button className="min-h-[44px] text-left" type="button" onClick={() => setSelectedPantryItemId(item.id)}>
                  <strong>{item.ingredientName}</strong>
                  <div className="muted">
                    {formatQuantity(item.quantity, item.unit)} - {item.locationName ?? "Unassigned"}
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <span className="pill">{item.status}</span>
                  <button
                    className="ui-button ui-button-ghost ui-button-sm min-w-[44px]"
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setError(null);
                      startTransition(() => {
                        handleUndoableDeletePantryItem(item).catch((err: unknown) => {
                          setError(err instanceof Error ? err.message : "Unable to delete pantry item.");
                        });
                      });
                    }}
                  >
                    Trash
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredPantryItems.length === 0 ? <p className="muted">No pantry items match this view.</p> : null}
        </div>
      </article>

      {selectedPantryItem ? (
        <article className="panel" data-testid="food-pantry-detail">
          <div className="eyebrow">Pantry detail</div>
          <h2>{selectedPantryItem.ingredientName}</h2>
          <div className="grid mt-4">
            <div className="field">
              <span>Location</span>
              <select value={pantryEditLocationId} onChange={(event) => setPantryEditLocationId(event.target.value)}>
                {data.pantryLocations.map((location: any) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <span>Status</span>
              <select value={pantryEditStatus} onChange={(event) => setPantryEditStatus(event.target.value)}>
                <option value="InStock">In stock</option>
                <option value="Low">Low</option>
                <option value="Out">Out</option>
              </select>
            </div>
          </div>
          <div className="grid">
            <div className="field">
              <span>Quantity</span>
              <input type="number" value={pantryEditQuantity} onChange={(event) => setPantryEditQuantity(event.target.value)} />
            </div>
            <div className="field">
              <span>Unit</span>
              <input value={pantryEditUnit} onChange={(event) => setPantryEditUnit(event.target.value)} />
            </div>
            <div className="field">
              <span>Low threshold</span>
              <input type="number" value={pantryEditLowThreshold} onChange={(event) => setPantryEditLowThreshold(event.target.value)} />
            </div>
          </div>
          <div className="grid">
            <div className="field">
              <span>Purchased</span>
              <input type="date" value={pantryEditPurchasedAt} onChange={(event) => setPantryEditPurchasedAt(event.target.value)} />
            </div>
            <div className="field">
              <span>Expires</span>
              <input type="date" value={pantryEditExpiresAt} onChange={(event) => setPantryEditExpiresAt(event.target.value)} />
            </div>
          </div>
          <div className="field">
            <span>Note</span>
            <input data-testid="food-pantry-detail-note" value={pantryEditNote} onChange={(event) => setPantryEditNote(event.target.value)} />
          </div>
          <div className="action-row">
            <button
              className="action-button"
              data-testid="food-pantry-save"
              type="button"
              onClick={() => {
                setError(null);
                startTransition(() => {
                  handleUpdatePantryItem().catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : "Unable to update pantry item.");
                  });
                });
              }}
            >
              Save pantry item
            </button>
          </div>
          <div className="stack-list mt-4">
            {pantryHistory.map((entry: any) => (
              <div className="stack-card" key={entry.id}>
                <div className="stack-card-header">
                  <strong>{entry.kind}</strong>
                  <span className="muted">{formatTimestamp(entry.occurredAtUtc)}</span>
                </div>
                <div className="muted">{entry.note ?? entry.sourceLabel ?? "No note"}</div>
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}
