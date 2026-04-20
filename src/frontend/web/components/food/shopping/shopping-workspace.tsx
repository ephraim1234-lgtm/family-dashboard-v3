"use client";

import { useState } from "react";
import { ShoppingTripDetail } from "./shopping-trip-detail";
import { useFoodHubContext } from "../food-hub-context";
import { SubTabs } from "@/components/ui";

export function ShoppingWorkspace() {
  const {
    data,
    activeShoppingItems,
    shoppingMealFilterId,
    setShoppingMealFilterId,
    shoppingGroupMode,
    setShoppingGroupMode,
    shoppingItemsByAisle,
    formatQuantity,
    setError,
    startTransition,
    handleToggleShoppingItem,
    handleSkipShoppingItem,
    handleMarkAllShoppingItemsPurchased,
    handleDeleteShoppingItem,
    purchasedShoppingItems,
    purchasedCount,
    setPostPurchaseOpen,
    selectedHistoryTripId,
    setSelectedHistoryTripId,
    historyTripQuery
  } = useFoodHubContext();
  const [shoppingWorkspaceTab, setShoppingWorkspaceTab] = useState<"list" | "history">("list");

  return (
    <>
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Shopping workspace</div>
          <h2>Track shopping, purchases, and history</h2>
          <SubTabs
            tabs={[
              { id: "list", label: "Shop list" },
              { id: "history", label: "Trip history" }
            ]}
            activeTab={shoppingWorkspaceTab}
            onChange={setShoppingWorkspaceTab}
            ariaLabel="Shopping tabs"
          />
        </article>
      </section>

      {shoppingWorkspaceTab === "list" ? (
        <section className="grid gap-4">
          <article className="panel" data-testid="food-shopping-panel">
            <div className="stack-card-header">
              <div>
                <div className="eyebrow">Shopping</div>
                <h2 className="m-0">{data.shoppingList.name}</h2>
              </div>
              <span className="pill">{activeShoppingItems.length} open</span>
            </div>

            <div className="action-row mt-3">
              <button
                className={shoppingGroupMode === "flat" ? "sub-tab-button sub-tab-button-active" : "sub-tab-button"}
                type="button"
                onClick={() => setShoppingGroupMode("flat")}
              >
                Flat
              </button>
              <button
                className={shoppingGroupMode === "aisle" ? "sub-tab-button sub-tab-button-active" : "sub-tab-button"}
                type="button"
                onClick={() => setShoppingGroupMode("aisle")}
              >
                By aisle
              </button>
              <button
                className="pill-button"
                type="button"
                disabled={activeShoppingItems.length === 0}
                onClick={() => {
                  setError(null);
                  startTransition(() => {
                    handleMarkAllShoppingItemsPurchased(activeShoppingItems).catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : "Unable to bulk update shopping items.");
                    });
                  });
                }}
              >
                Mark All Purchased
              </button>
              <button
                className="pill-button"
                type="button"
                disabled={purchasedShoppingItems.length === 0}
                onClick={() => {
                  setError(null);
                  startTransition(() => {
                    Promise.all(
                      purchasedShoppingItems
                        .filter((item: any) => item.state === "Purchased")
                        .map((item: any) => handleDeleteShoppingItem(item))
                    ).catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : "Unable to clear completed items.");
                    });
                  });
                }}
              >
                Clear Completed
              </button>
            </div>

            {shoppingMealFilterId ? (
              <div className="action-row mt-2.5">
                <span className="pill">Filtered to one meal</span>
                <button className="pill-button" type="button" onClick={() => setShoppingMealFilterId(null)}>
                  Clear filter
                </button>
              </div>
            ) : null}

            <div className="stack-list mt-4">
              {shoppingGroupMode === "aisle"
                ? shoppingItemsByAisle.map(([aisle, items]: [string, any[]]) => (
                  <section key={aisle}>
                    <div className="eyebrow mb-2">{aisle}</div>
                    <div className="stack-list">
                      {items.map((item: any) => (
                        <ShoppingItemRow
                          item={item}
                          key={item.id}
                          formatQuantity={formatQuantity}
                          onBought={handleToggleShoppingItem}
                          onSkipped={handleSkipShoppingItem}
                          onDelete={handleDeleteShoppingItem}
                          setError={setError}
                          startTransition={startTransition}
                        />
                      ))}
                    </div>
                  </section>
                ))
                : activeShoppingItems.map((item: any) => (
                  <ShoppingItemRow
                    item={item}
                    key={item.id}
                    formatQuantity={formatQuantity}
                    onBought={handleToggleShoppingItem}
                    onSkipped={handleSkipShoppingItem}
                    onDelete={handleDeleteShoppingItem}
                    setError={setError}
                    startTransition={startTransition}
                  />
                ))}
            </div>

            {purchasedCount > 0 ? (
              <div className="mt-4 scroll-mb-48 rounded-box border border-base-300 p-4">
                <div className="stack-card-header">
                  <strong>{purchasedCount} items purchased</strong>
                  <button className="btn btn-primary min-h-[44px]" type="button" onClick={() => setPostPurchaseOpen(true)}>
                    Confirm / Complete
                  </button>
                </div>
              </div>
            ) : null}

            {purchasedShoppingItems.length > 0 ? (
              <details className="mt-4">
                <summary className="muted">Purchased or skipped ({purchasedShoppingItems.length})</summary>
                <div className="stack-list mt-3">
                  {purchasedShoppingItems.map((item: any) => (
                    <div className="stack-card" key={`purchased-${item.id}`}>
                      <div className="stack-card-header">
                        <div className="flex-1">
                          <strong className={item.state === "Skipped" ? "opacity-60" : ""}>{item.ingredientName}</strong>
                          <div className="muted">
                            {formatQuantity(item.quantityPurchased ?? item.quantityNeeded, item.unit)}
                          </div>
                        </div>
                        <span className="pill">{item.state}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </article>
        </section>
      ) : null}

      {shoppingWorkspaceTab === "history" ? (
        <section className="grid gap-4">
          <article className="panel" data-testid="food-shopping-history">
            <div className="eyebrow">Trip history</div>
            <h2>Review completed trips without mixing them into the active list</h2>
            <div className="stack-list mt-3.5">
              {data.shoppingHistory.map((trip: any) => (
                <div className="stack-card" key={trip.id}>
                  <div className="stack-card-header">
                    <div>
                      <strong>{trip.name}</strong>
                      <div className="muted">{trip.itemsPurchasedCount}/{trip.totalItemCount} purchased</div>
                    </div>
                    <button className="pill-button" type="button" onClick={() => setSelectedHistoryTripId(trip.id)}>
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
          {selectedHistoryTripId && historyTripQuery.data ? (
            <ShoppingTripDetail
              trip={historyTripQuery.data}
              loading={historyTripQuery.isLoading}
              onClose={() => setSelectedHistoryTripId(null)}
            />
          ) : null}
        </section>
      ) : null}
    </>
  );
}

function ShoppingItemRow({
  item,
  formatQuantity,
  onBought,
  onSkipped,
  onDelete,
  setError,
  startTransition
}: {
  item: any;
  formatQuantity: (quantity: number | null, unit: string | null) => string;
  onBought: (item: any, nextCompleted: boolean) => Promise<void>;
  onSkipped: (item: any) => Promise<void>;
  onDelete: (item: any) => Promise<void>;
  setError: (message: string | null) => void;
  startTransition: (callback: () => void) => void;
}) {
  return (
    <div className="stack-card">
      <div className="stack-card-header">
        <div>
          <strong>{item.ingredientName}</strong>
          <div className="muted">
            {formatQuantity(item.quantityNeeded, item.unit)}
            {item.sourceMealTitle ? ` - ${item.sourceMealTitle}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-success btn-sm min-h-[44px]"
            type="button"
            onClick={() => {
              setError(null);
              startTransition(() => {
                onBought(item, true).catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : "Unable to mark item purchased.");
                });
              });
            }}
          >
            Bought
          </button>
          <button
            className="btn btn-ghost btn-sm min-h-[44px]"
            type="button"
            onClick={() => {
              setError(null);
              startTransition(() => {
                onSkipped(item).catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : "Unable to skip item.");
                });
              });
            }}
          >
            Didn&apos;t Buy
          </button>
          <button
            className="btn btn-ghost btn-sm min-h-[44px] min-w-[44px]"
            type="button"
            onClick={() => {
              setError(null);
              startTransition(() => {
                onDelete(item).catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : "Unable to delete shopping item.");
                });
              });
            }}
          >
            Trash
          </button>
        </div>
      </div>
      {item.state === "NeedsReview" ? <div className="badge badge-warning">Needs review</div> : null}
    </div>
  );
}
