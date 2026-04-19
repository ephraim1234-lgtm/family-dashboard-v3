"use client";

import { useState } from "react";
import { ClaimControl } from "./claim-control";
import { ShoppingTripDetail } from "./shopping-trip-detail";
import { useFoodHubContext } from "../food-hub-context";
import { ModuleTabs } from "../shared/module-tabs";

export function ShoppingWorkspace() {
  const {
    data,
    activeShoppingItems,
    needsReviewItems,
    shoppingTab,
    setShoppingTab,
    shoppingGroupMode,
    setShoppingGroupMode,
    shoppingMealFilterId,
    setShoppingMealFilterId,
    shoppingName,
    setShoppingName,
    shoppingQuantity,
    setShoppingQuantity,
    shoppingUnit,
    setShoppingUnit,
    shoppingNotes,
    setShoppingNotes,
    buildFieldTestId,
    mergePreview,
    isPending,
    setError,
    startTransition,
    handleAddShoppingItem,
    purchasedCount,
    showCompleteTripDialog,
    setShowCompleteTripDialog,
    moveCheckedToPantryOnComplete,
    setMoveCheckedToPantryOnComplete,
    handleCompleteTrip,
    formatQuantity,
    handleClearNeedsReview,
    handleSplitNeedsReview,
    handleToggleShoppingItem,
    handleDeleteShoppingItem,
    handleClaimShoppingItem,
    handleReleaseShoppingItem,
    selectedHistoryTripId,
    setSelectedHistoryTripId,
    historyTripQuery,
    shoppingItemsByAisle,
    purchasedShoppingItems
  } = useFoodHubContext();
  const [shoppingWorkspaceTab, setShoppingWorkspaceTab] = useState<"list" | "review" | "history">("list");

  return (
    <>
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Shopping workspace</div>
          <h2>Separate shopping, review, and trip history</h2>
          <ModuleTabs
            tabs={[
              { id: "list", label: "Shop list" },
              { id: "review", label: "Needs review" },
              { id: "history", label: "Trip history" }
            ]}
            activeTab={shoppingWorkspaceTab}
            onChange={setShoppingWorkspaceTab}
          />
        </article>
      </section>

      <section className="grid food-section-grid">
        {shoppingWorkspaceTab === "list" ? (
          <article className="panel" data-testid="food-shopping-panel">
            <div className="eyebrow">Shopping</div>
            <div className="stack-card-header">
              <h2 style={{ margin: 0 }}>{data.shoppingList.name}</h2>
              <span className="pill">{activeShoppingItems.length} open</span>
            </div>
            <div className="action-row" style={{ marginTop: "12px" }}>
              <button
                className={shoppingTab === "active" ? "food-tab-button food-tab-button-active" : "food-tab-button"}
                type="button"
                onClick={() => setShoppingTab("active")}
              >
                Active
              </button>
              <button
                className={shoppingGroupMode === "flat" ? "food-tab-button food-tab-button-active" : "food-tab-button"}
                type="button"
                onClick={() => setShoppingGroupMode("flat")}
              >
                Flat
              </button>
              <button
                className={shoppingGroupMode === "aisle" ? "food-tab-button food-tab-button-active" : "food-tab-button"}
                type="button"
                onClick={() => setShoppingGroupMode("aisle")}
              >
                By aisle
              </button>
            </div>
            {shoppingMealFilterId ? (
              <div className="action-row" style={{ marginTop: "10px" }}>
                <span className="pill">Filtered to one meal</span>
                <button className="pill-button" type="button" onClick={() => setShoppingMealFilterId(null)}>
                  Clear filter
                </button>
              </div>
            ) : null}

            <div className="grid" style={{ marginTop: "12px" }}>
              <div className="field">
                <span>Item</span>
                <input
                  aria-label="Shopping item name"
                  data-testid={buildFieldTestId("food-shopping-add", "item")}
                  value={shoppingName}
                  onChange={(event) => setShoppingName(event.target.value)}
                />
              </div>
              <div className="field">
                <span>Qty</span>
                <input
                  aria-label="Shopping quantity"
                  data-testid={buildFieldTestId("food-shopping-add", "quantity")}
                  type="number"
                  step="0.25"
                  value={shoppingQuantity}
                  onChange={(event) => setShoppingQuantity(event.target.value)}
                />
              </div>
              <div className="field">
                <span>Unit</span>
                <input
                  aria-label="Shopping unit"
                  data-testid={buildFieldTestId("food-shopping-add", "unit")}
                  value={shoppingUnit}
                  onChange={(event) => setShoppingUnit(event.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <span>Notes</span>
              <input
                aria-label="Shopping notes"
                data-testid={buildFieldTestId("food-shopping-add", "notes")}
                value={shoppingNotes}
                onChange={(event) => setShoppingNotes(event.target.value)}
              />
            </div>
            {mergePreview?.willMerge ? (
              <div className="stack-card" style={{ marginTop: "12px", borderColor: "rgba(214, 158, 46, 0.45)" }}>
                <strong>Merge into existing</strong>
                <div className="muted" style={{ marginTop: "6px" }}>
                  {mergePreview.existingItemName} will absorb this line
                  {mergePreview.mergedQuantityNeeded != null ? ` (${formatQuantity(mergePreview.mergedQuantityNeeded, mergePreview.unit)})` : ""}.
                </div>
              </div>
            ) : null}
            <div className="action-row">
              <button
                className="action-button"
                data-testid="food-shopping-add-submit"
                disabled={isPending || !shoppingName.trim()}
                onClick={() => {
                  setError(null);
                  startTransition(() => {
                    handleAddShoppingItem().catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : "Unable to add shopping item.");
                    });
                  });
                }}
              >
                {mergePreview?.willMerge ? "Merge into existing" : "Add to list"}
              </button>
              {purchasedCount > 0 ? (
                <button
                  className="food-secondary-button"
                  type="button"
                  onClick={() => setShowCompleteTripDialog((current: boolean) => !current)}
                >
                  I'm back from the store
                </button>
              ) : null}
            </div>
            {showCompleteTripDialog ? (
              <div className="stack-card" style={{ marginTop: "14px" }}>
                <strong>Complete this trip?</strong>
                <label className="checkbox-field" style={{ marginTop: "10px" }}>
                  <input
                    type="checkbox"
                    checked={moveCheckedToPantryOnComplete}
                    onChange={(event) => setMoveCheckedToPantryOnComplete(event.target.checked)}
                  />
                  Add purchased items to pantry
                </label>
                <div className="action-row" style={{ marginTop: "10px" }}>
                  <button
                    className="action-button"
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setError(null);
                      startTransition(() => {
                        handleCompleteTrip().catch((err: unknown) => {
                          setError(err instanceof Error ? err.message : "Unable to complete shopping trip.");
                        });
                      });
                    }}
                  >
                    Complete trip
                  </button>
                  <button className="food-secondary-button" type="button" onClick={() => setShowCompleteTripDialog(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {shoppingGroupMode === "aisle" ? (
              <div className="stack-list" style={{ marginTop: "14px" }}>
                {shoppingItemsByAisle.map(([aisle, items]: [string, any[]]) => (
                  <div className="stack-card" key={aisle}>
                    <div className="stack-card-header">
                      <strong>{aisle}</strong>
                      <span className="pill">{items.length}</span>
                    </div>
                    <div className="stack-list" style={{ marginTop: "10px" }}>
                      {items.map((item: any) => (
                        <ShoppingRow
                          key={item.id}
                          item={item}
                          formatQuantity={formatQuantity}
                          isPending={isPending}
                          onClaim={handleClaimShoppingItem}
                          onRelease={handleReleaseShoppingItem}
                          onToggle={handleToggleShoppingItem}
                          onDelete={handleDeleteShoppingItem}
                          setError={setError}
                          startTransition={startTransition}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {shoppingItemsByAisle.length === 0 ? <div className="muted">No active items match this view.</div> : null}
              </div>
            ) : (
              <div className="stack-list" style={{ marginTop: "14px" }}>
                {activeShoppingItems.map((item: any) => (
                  <ShoppingRow
                    key={item.id}
                    item={item}
                    formatQuantity={formatQuantity}
                    isPending={isPending}
                    onClaim={handleClaimShoppingItem}
                    onRelease={handleReleaseShoppingItem}
                    onToggle={handleToggleShoppingItem}
                    onDelete={handleDeleteShoppingItem}
                    setError={setError}
                    startTransition={startTransition}
                  />
                ))}
                {activeShoppingItems.length === 0 ? <div className="muted">No active items match this view.</div> : null}
              </div>
            )}

            {purchasedShoppingItems.length > 0 ? (
              <details style={{ marginTop: "14px" }}>
                <summary className="muted">Purchased today ({purchasedShoppingItems.length})</summary>
                <div className="stack-list" style={{ marginTop: "10px" }}>
                  {purchasedShoppingItems.map((item: any) => (
                    <div className="stack-card" key={`purchased-${item.id}`}>
                      <div className="stack-card-header">
                        <div style={{ flex: 1 }}>
                          <strong style={{ textDecoration: "line-through" }}>{item.ingredientName}</strong>
                          <div className="muted">
                            {formatQuantity(item.quantityPurchased ?? item.quantityNeeded, item.unit)}
                            {item.sourceMealTitle ? ` - for ${item.sourceMealTitle}` : item.sourceRecipeTitle ? ` - from ${item.sourceRecipeTitle}` : ""}
                          </div>
                        </div>
                        <span className="pill">Purchased</span>
                      </div>
                      {item.notes ? <div className="muted">{item.notes}</div> : null}
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </article>
        ) : null}

        {shoppingWorkspaceTab === "review" ? (
          <article className="panel" data-testid="food-shopping-review">
            <div className="eyebrow">Needs review</div>
            <h2>Resolve edge cases before heading to the store</h2>
            {needsReviewItems.length > 0 ? (
              <div className="stack-list" style={{ marginTop: "14px" }}>
                {needsReviewItems.map((item: any) => (
                  <div className="stack-card" key={`review-${item.id}`} style={{ borderColor: "rgba(214, 158, 46, 0.45)" }}>
                    <div className="stack-card-header">
                      <div>
                        <strong>{item.ingredientName}</strong>
                        <div className="muted">
                          Review {formatQuantity(item.quantityNeeded, item.unit)}
                          {item.sourceMealTitle ? ` - for ${item.sourceMealTitle}` : ""}
                        </div>
                      </div>
                      <span className="pill">Review</span>
                    </div>
                    {item.notes ? <div className="muted">{item.notes}</div> : null}
                    <div className="action-row" style={{ marginTop: "10px" }}>
                      <button
                        className="food-secondary-button"
                        type="button"
                        onClick={() => {
                          setError(null);
                          startTransition(() => {
                            handleClearNeedsReview(item).catch((err: unknown) => {
                              setError(err instanceof Error ? err.message : "Unable to clear review.");
                            });
                          });
                        }}
                      >
                        Looks right
                      </button>
                      <button
                        className="pill-button"
                        type="button"
                        onClick={() => {
                          setError(null);
                          startTransition(() => {
                            handleSplitNeedsReview(item).catch((err: unknown) => {
                              setError(err instanceof Error ? err.message : "Unable to split review item.");
                            });
                          });
                        }}
                      >
                        Split line
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ marginTop: "12px" }}>
                Nothing needs review right now.
              </p>
            )}
          </article>
        ) : null}

        {shoppingWorkspaceTab === "history" ? (
          <article className="panel" data-testid="food-shopping-history">
            <div className="eyebrow">Trip history</div>
            <h2>Review completed trips without mixing them into the active list</h2>
            <div className="stack-list" style={{ marginTop: "14px" }}>
              {data.shoppingHistory.map((trip: any) => (
                <div className="stack-card" key={trip.id}>
                  <div className="stack-card-header">
                    <strong>{trip.name}</strong>
                    <span className="pill">{trip.status}</span>
                  </div>
                  <div className="muted">
                    {trip.completedAtUtc ? new Date(trip.completedAtUtc).toLocaleString() : new Date(trip.createdAtUtc).toLocaleString()}
                    {" - "}
                    {trip.itemsPurchasedCount}/{trip.totalItemCount} purchased
                  </div>
                  {trip.sourceMealTitles ? <div className="muted">{trip.sourceMealTitles}</div> : null}
                  <div className="action-row" style={{ marginTop: "10px" }}>
                    <button className="pill-button" type="button" onClick={() => setSelectedHistoryTripId(trip.id)}>
                      View trip
                    </button>
                  </div>
                </div>
              ))}
              <ShoppingTripDetail
                trip={selectedHistoryTripId ? historyTripQuery.data : null}
                loading={historyTripQuery.isLoading}
                onClose={() => setSelectedHistoryTripId(null)}
              />
            </div>
          </article>
        ) : null}
      </section>
    </>
  );
}

function ShoppingRow({
  item,
  formatQuantity,
  isPending,
  onClaim,
  onRelease,
  onToggle,
  onDelete,
  setError,
  startTransition
}: {
  item: any;
  formatQuantity: (quantity: number | null, unit: string | null) => string;
  isPending: boolean;
  onClaim: (item: any) => Promise<void>;
  onRelease: (item: any) => Promise<void>;
  onToggle: (item: any, nextCompleted: boolean) => Promise<void>;
  onDelete: (item: any) => Promise<void>;
  setError: (message: string | null) => void;
  startTransition: (callback: () => void) => void;
}) {
  return (
    <div className="stack-card" data-testid={`food-shopping-item-${item.id}`}>
      <div className="stack-card-header">
        <div style={{ flex: 1 }}>
          <strong>{item.ingredientName}</strong>
          <div className="muted">
            {formatQuantity(item.quantityNeeded, item.unit)}
            {item.sourceMealTitle ? ` - for ${item.sourceMealTitle}` : item.sourceRecipeTitle ? ` - from ${item.sourceRecipeTitle}` : ""}
          </div>
        </div>
        <span className="pill">{item.state}</span>
      </div>
      {item.notes ? <div className="muted">{item.notes}</div> : null}
      <div className="action-row" style={{ marginTop: "10px" }}>
        <label className="checkbox-field" style={{ margin: 0 }}>
          <input
            aria-label={`Shopping item completed ${item.ingredientName}`}
            data-testid={`food-shopping-item-toggle-${item.id}`}
            type="checkbox"
            checked={item.state === "Purchased"}
            onChange={(event) => {
              setError(null);
              startTransition(() => {
                onToggle(item, event.target.checked).catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : "Unable to update shopping item.");
                });
              });
            }}
          />
          Purchased
        </label>
        <ClaimControl
          claimed={Boolean(item.claimedByUserId)}
          disabled={isPending}
          onClaim={() => {
            setError(null);
            startTransition(() => {
              onClaim(item).catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Unable to claim shopping item.");
              });
            });
          }}
          onRelease={() => {
            setError(null);
            startTransition(() => {
              onRelease(item).catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Unable to release shopping item.");
              });
            });
          }}
        />
        <button
          className="food-delete-button"
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!window.confirm(`Delete "${item.ingredientName}" from the shopping list?`)) {
              return;
            }

            setError(null);
            startTransition(() => {
              onDelete(item).catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Unable to delete shopping item.");
              });
            });
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
