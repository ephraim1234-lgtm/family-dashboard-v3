"use client";

import { useState } from "react";
import { ShoppingTripDetail } from "./shopping-trip-detail";
import { useFoodHubContext } from "../food-hub-context";
import { ActionButton, EmptyState, PageContainer, PageHeader, SectionHeader, SubTabs } from "@/components/ui";

export function ShoppingWorkspace() {
  const {
    data,
    activeShoppingItems,
    completedShoppingItems,
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
    <PageContainer>
      <PageHeader
        eyebrow="Shopping workspace"
        title="Track purchases, review completed items, and confirm pantry transfer once"
      >
        <SubTabs
          tabs={[
            { id: "list", label: "Shop list" },
            { id: "history", label: "Trip history" }
          ]}
          activeTab={shoppingWorkspaceTab}
          onChange={setShoppingWorkspaceTab}
          ariaLabel="Shopping tabs"
        />
      </PageHeader>

      {shoppingWorkspaceTab === "list" ? (
        <section className="grid gap-4">
          <article className="panel" data-testid="food-shopping-panel">
            <SectionHeader
              actions={<span className="pill">{activeShoppingItems.length} open</span>}
              eyebrow="Shopping"
              title={data.shoppingList.name}
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <ActionButton
                size="sm"
                variant={shoppingGroupMode === "flat" ? "active" : "ghost"}
                onClick={() => setShoppingGroupMode("flat")}
              >
                Flat
              </ActionButton>
              <ActionButton
                size="sm"
                variant={shoppingGroupMode === "aisle" ? "active" : "ghost"}
                onClick={() => setShoppingGroupMode("aisle")}
              >
                By aisle
              </ActionButton>
              <ActionButton
                disabled={activeShoppingItems.length === 0}
                size="sm"
                variant="ghost"
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
              </ActionButton>
              <ActionButton
                disabled={purchasedShoppingItems.length === 0}
                size="sm"
                variant="ghost"
                onClick={() => {
                  setError(null);
                  startTransition(() => {
                    Promise.all(purchasedShoppingItems.map((item: any) => handleDeleteShoppingItem(item))).catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : "Unable to clear completed items.");
                    });
                  });
                }}
              >
                Clear Completed
              </ActionButton>
            </div>

            {shoppingMealFilterId ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="pill">Filtered to one meal</span>
                <ActionButton size="sm" variant="ghost" onClick={() => setShoppingMealFilterId(null)}>
                  Clear filter
                </ActionButton>
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
              <div className="ui-inline-card mt-4 scroll-mb-48">
                <div className="stack-card-header">
                  <strong>{purchasedCount} items purchased</strong>
                  <ActionButton size="sm" onClick={() => setPostPurchaseOpen(true)}>
                    Confirm / Complete
                  </ActionButton>
                </div>
              </div>
            ) : null}

            {completedShoppingItems.length > 0 ? (
              <details className="mt-4">
                <summary className="muted">Purchased or skipped ({completedShoppingItems.length})</summary>
                <div className="stack-list mt-3">
                  {completedShoppingItems.map((item: any) => (
                    <div className="stack-card" key={`completed-${item.id}`}>
                      <div className="stack-card-header">
                        <div className="flex-1">
                          <strong className={item.state === "Skipped" ? "opacity-60" : ""}>{item.ingredientName}</strong>
                          <div className="muted">
                            {formatQuantity(item.quantityPurchased ?? item.quantityNeeded, item.unit)}
                          </div>
                        </div>
                        <span className={`pill ${item.state === "Skipped" ? "opacity-60" : ""}`}>{item.state}</span>
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
            <SectionHeader
              eyebrow="Trip history"
              title="Review completed trips without mixing them into the active list"
            />
            <div className="stack-list mt-3.5">
              {data.shoppingHistory.map((trip: any) => (
                <div className="stack-card" key={trip.id}>
                  <div className="stack-card-header">
                    <div>
                      <strong>{trip.name}</strong>
                      <div className="muted">{trip.itemsPurchasedCount}/{trip.totalItemCount} purchased</div>
                    </div>
                    <button className="ui-button ui-button-ghost ui-button-sm" type="button" onClick={() => setSelectedHistoryTripId(trip.id)}>
                      Open
                    </button>
                  </div>
                </div>
              ))}
              {data.shoppingHistory.length === 0 ? (
                <EmptyState message="Completed shopping trips will appear here once a list has been finished." />
              ) : null}
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
    </PageContainer>
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
    <div className={`stack-card ${item.state === "NeedsReview" ? "stack-card-warning" : ""}`}>
      <div className="stack-card-header">
        <div>
          <strong>{item.ingredientName}</strong>
          <div className="muted">
            {formatQuantity(item.quantityNeeded, item.unit)}
            {item.sourceMealTitle ? ` - ${item.sourceMealTitle}` : ""}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="ui-button ui-button-success ui-button-sm"
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
            className="ui-button ui-button-ghost ui-button-sm"
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
            className="ui-button ui-button-ghost ui-button-sm min-w-[44px]"
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
      {item.state === "NeedsReview" ? <div className="ui-badge ui-badge-warning">Needs review</div> : null}
    </div>
  );
}
