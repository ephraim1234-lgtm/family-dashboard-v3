"use client";

import { useState } from "react";
import { useFoodHubContext } from "../food-hub-context";
import { ModuleTabs } from "../shared/module-tabs";

export function PantryWorkspace() {
  const {
    data,
    pantryName,
    setPantryName,
    pantryLocationId,
    setPantryLocationId,
    pantryQuantity,
    setPantryQuantity,
    pantryUnit,
    setPantryUnit,
    pantryLowThreshold,
    setPantryLowThreshold,
    pantryExpiresAt,
    setPantryExpiresAt,
    buildFieldTestId,
    isPending,
    setError,
    startTransition,
    handleAddPantryItem,
    lowStockItems,
    formatQuantity,
    setSelectedPantryItemId,
    handleAddLowStockToShopping,
    selectedPantryItem,
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
    handleDeletePantryItem,
    pantryHistory,
    formatTimestamp
  } = useFoodHubContext();
  const [pantryTab, setPantryTab] = useState<"inventory" | "low" | "detail">("inventory");

  return (
    <>
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Pantry workspace</div>
          <h2>Track inventory without mixing browsing and editing together</h2>
          <ModuleTabs
            tabs={[
              { id: "inventory", label: "Inventory" },
              { id: "low", label: "Low stock" },
              { id: "detail", label: "Item detail" }
            ]}
            activeTab={pantryTab}
            onChange={setPantryTab}
          />
        </article>
      </section>

      <section className="grid food-section-grid">
        {pantryTab === "inventory" ? (
          <article className="panel" data-testid="food-pantry-panel">
            <div className="eyebrow">Pantry</div>
            <h2>Low-friction inventory with real adjustment history</h2>
            <div className="grid" style={{ marginTop: "12px" }}>
              <div className="field">
                <span>Item</span>
                <input
                  aria-label="Pantry item name"
                  data-testid={buildFieldTestId("food-pantry-add", "item")}
                  value={pantryName}
                  onChange={(event) => setPantryName(event.target.value)}
                />
              </div>
              <div className="field">
                <span>Location</span>
                <select
                  aria-label="Pantry location"
                  data-testid={buildFieldTestId("food-pantry-add", "location")}
                  value={pantryLocationId}
                  onChange={(event) => setPantryLocationId(event.target.value)}
                >
                  {data.pantryLocations.map((location: any) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <span>Qty</span>
                <input
                  aria-label="Pantry quantity"
                  data-testid={buildFieldTestId("food-pantry-add", "quantity")}
                  type="number"
                  step="0.25"
                  value={pantryQuantity}
                  onChange={(event) => setPantryQuantity(event.target.value)}
                />
              </div>
              <div className="field">
                <span>Unit</span>
                <input
                  aria-label="Pantry unit"
                  data-testid={buildFieldTestId("food-pantry-add", "unit")}
                  value={pantryUnit}
                  onChange={(event) => setPantryUnit(event.target.value)}
                />
              </div>
            </div>
            <div className="grid">
              <div className="field">
                <span>Low threshold</span>
                <input
                  aria-label="Pantry low threshold"
                  data-testid={buildFieldTestId("food-pantry-add", "low-threshold")}
                  type="number"
                  step="0.25"
                  value={pantryLowThreshold}
                  onChange={(event) => setPantryLowThreshold(event.target.value)}
                />
              </div>
              <div className="field">
                <span>Expires</span>
                <input
                  aria-label="Pantry expires"
                  data-testid={buildFieldTestId("food-pantry-add", "expires")}
                  type="date"
                  value={pantryExpiresAt}
                  onChange={(event) => setPantryExpiresAt(event.target.value)}
                />
              </div>
            </div>
            <div className="action-row">
              <button
                className="action-button"
                data-testid="food-pantry-add-submit"
                disabled={isPending || !pantryName.trim()}
                onClick={() => {
                  setError(null);
                  startTransition(() => {
                    handleAddPantryItem().catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : "Unable to add pantry item.");
                    });
                  });
                }}
              >
                Add pantry item
              </button>
            </div>

            <div className="stack-list" style={{ marginTop: "16px" }}>
              {data.pantryItems.map((item: any) => (
                <div className="stack-card food-row-shell" data-testid={`food-pantry-item-${item.id}`} key={item.id}>
                  <div className="stack-card-header">
                    <strong>{item.ingredientName}</strong>
                    <span className="pill">{item.status}</span>
                  </div>
                  <div className="muted">
                    {formatQuantity(item.quantity, item.unit)} - {item.locationName ?? "Unassigned"}
                  </div>
                  <div className="food-card-actions">
                    <button
                      className="food-secondary-button"
                      type="button"
                      onClick={() => {
                        setSelectedPantryItemId(item.id);
                        setPantryTab("detail");
                      }}
                    >
                      Open item
                    </button>
                    <button
                      className="food-delete-button"
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        if (!window.confirm(`Delete pantry item "${item.ingredientName}" and its activity history?`)) {
                          return;
                        }

                        setError(null);
                        startTransition(() => {
                          handleDeletePantryItem(item.id).catch((err: unknown) => {
                            setError(err instanceof Error ? err.message : "Unable to delete pantry item.");
                          });
                        });
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {pantryTab === "low" ? (
          <article className="panel" data-testid="food-pantry-low-stock">
            <div className="eyebrow">Low stock</div>
            <h2>Review gaps and push them into shopping</h2>
            {lowStockItems.length > 0 ? (
              <div className="stack-list" style={{ marginTop: "16px" }}>
                {lowStockItems.map((item: any) => (
                  <div className="stack-card home-attention-card" data-testid={`food-pantry-low-${item.id}`} key={item.id}>
                    <div className="stack-card-header">
                      <strong>{item.ingredientName}</strong>
                      <span className="pill">{item.status}</span>
                    </div>
                    <div className="muted">
                      {formatQuantity(item.quantity, item.unit)} - {item.locationName ?? "Unassigned"}
                    </div>
                    <div className="action-row" style={{ marginTop: "10px" }}>
                      <button
                        className="food-secondary-button"
                        type="button"
                        onClick={() => {
                          setSelectedPantryItemId(item.id);
                          setPantryTab("detail");
                        }}
                      >
                        View detail
                      </button>
                      <button
                        className="food-secondary-button"
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          setError(null);
                          startTransition(() => {
                            handleAddLowStockToShopping(item).catch((err: unknown) => {
                              setError(err instanceof Error ? err.message : "Unable to add low-stock item to shopping.");
                            });
                          });
                        }}
                      >
                        Add to list
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ marginTop: "12px" }}>
                Nothing is low right now.
              </p>
            )}
          </article>
        ) : null}

        {pantryTab === "detail" ? (
          <article className="panel" data-testid="food-pantry-detail">
            <div className="eyebrow">Pantry detail</div>
            <h2>{selectedPantryItem?.ingredientName ?? "Choose a pantry item"}</h2>
            {selectedPantryItem ? (
              <>
                <div className="grid" style={{ marginTop: "12px" }}>
                  <div className="field">
                    <span>Location</span>
                    <select
                      aria-label="Pantry detail location"
                      data-testid={buildFieldTestId("food-pantry-detail", "location")}
                      value={pantryEditLocationId}
                      onChange={(event) => setPantryEditLocationId(event.target.value)}
                    >
                      {data.pantryLocations.map((location: any) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <span>Status</span>
                    <select
                      aria-label="Pantry detail status"
                      data-testid={buildFieldTestId("food-pantry-detail", "status")}
                      value={pantryEditStatus}
                      onChange={(event) => setPantryEditStatus(event.target.value)}
                    >
                      <option value="InStock">In stock</option>
                      <option value="Low">Low</option>
                      <option value="Out">Out</option>
                    </select>
                  </div>
                </div>
                <div className="grid">
                  <div className="field">
                    <span>Quantity</span>
                    <input
                      aria-label="Pantry detail quantity"
                      data-testid={buildFieldTestId("food-pantry-detail", "quantity")}
                      type="number"
                      step="0.25"
                      value={pantryEditQuantity}
                      onChange={(event) => setPantryEditQuantity(event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <span>Unit</span>
                    <input
                      aria-label="Pantry detail unit"
                      data-testid={buildFieldTestId("food-pantry-detail", "unit")}
                      value={pantryEditUnit}
                      onChange={(event) => setPantryEditUnit(event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <span>Low threshold</span>
                    <input
                      aria-label="Pantry detail low threshold"
                      data-testid={buildFieldTestId("food-pantry-detail", "low-threshold")}
                      type="number"
                      step="0.25"
                      value={pantryEditLowThreshold}
                      onChange={(event) => setPantryEditLowThreshold(event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid">
                  <div className="field">
                    <span>Purchased</span>
                    <input
                      aria-label="Pantry detail purchased"
                      data-testid={buildFieldTestId("food-pantry-detail", "purchased")}
                      type="date"
                      value={pantryEditPurchasedAt}
                      onChange={(event) => setPantryEditPurchasedAt(event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <span>Expires</span>
                    <input
                      aria-label="Pantry detail expires"
                      data-testid={buildFieldTestId("food-pantry-detail", "expires")}
                      type="date"
                      value={pantryEditExpiresAt}
                      onChange={(event) => setPantryEditExpiresAt(event.target.value)}
                    />
                  </div>
                </div>
                <div className="field">
                  <span>Adjustment note</span>
                  <input
                    aria-label="Pantry detail note"
                    data-testid={buildFieldTestId("food-pantry-detail", "note")}
                    value={pantryEditNote}
                    onChange={(event) => setPantryEditNote(event.target.value)}
                    placeholder="Why did this change?"
                  />
                </div>
                <div className="action-row">
                  <button
                    className="action-button"
                    data-testid="food-pantry-save"
                    disabled={isPending}
                    onClick={() => {
                      setError(null);
                      startTransition(() => {
                        handleUpdatePantryItem().catch((err: unknown) => {
                          setError(err instanceof Error ? err.message : "Unable to update pantry item.");
                        });
                      });
                    }}
                  >
                    Save pantry change
                  </button>
                  <button
                    className="food-delete-button"
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (!window.confirm("Delete this pantry item and its activity history?")) {
                        return;
                      }

                      setError(null);
                      startTransition(() => {
                        handleDeletePantryItem(selectedPantryItem.id).catch((err: unknown) => {
                          setError(err instanceof Error ? err.message : "Unable to delete pantry item.");
                        });
                      });
                    }}
                  >
                    Delete pantry item
                  </button>
                </div>

                <div className="stack-list" style={{ marginTop: "16px" }}>
                  {pantryHistory.map((entry: any) => (
                    <div className="stack-card" data-testid={`food-pantry-history-${entry.id}`} key={entry.id}>
                      <div className="stack-card-header">
                        <strong>{entry.kind}</strong>
                        <span className="pill">{formatTimestamp(entry.occurredAtUtc)}</span>
                      </div>
                      <div className="muted">
                        {entry.quantityDelta != null
                          ? `${entry.quantityDelta > 0 ? "+" : ""}${formatQuantity(entry.quantityDelta, entry.unit)}`
                          : "No quantity change"}{" "}
                        - after {formatQuantity(entry.quantityAfter, entry.unit)}
                      </div>
                      {entry.sourceLabel ? <div className="muted">Source: {entry.sourceLabel}</div> : null}
                      {entry.note ? <div className="muted">{entry.note}</div> : null}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted" style={{ marginTop: "12px" }}>
                Choose an item from Inventory or Low stock to edit it here.
              </p>
            )}
          </article>
        ) : null}
      </section>
    </>
  );
}
