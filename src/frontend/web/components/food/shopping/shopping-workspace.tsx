"use client";

import { useState } from "react";
import { ShoppingTripDetail } from "./shopping-trip-detail";
import { useFoodHubContext } from "../food-hub-context";
import {
  ActionButton,
  Badge,
  Card,
  EmptyState,
  ListCard,
  PageContainer,
  PageHeader,
  QuickActions,
  SectionHeader,
  StatCard,
  SubTabs
} from "@/components/ui";

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
        description="The active list stays separate from trip history so shopping still feels calm on a phone."
      >
        <div className="grid gap-3 lg:grid-cols-4">
          <StatCard label="Open items" tone={activeShoppingItems.length > 0 ? "accent" : "default"} value={activeShoppingItems.length} />
          <StatCard label="Purchased" value={purchasedCount} />
          <StatCard label="History trips" value={data.shoppingHistory.length} />
          <StatCard label="Grouped by" value={shoppingGroupMode === "aisle" ? "Aisle" : "Flat"} />
        </div>
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
          <Card className="space-y-4" data-testid="food-shopping-panel">
            <SectionHeader
              actions={<Badge>{activeShoppingItems.length} open</Badge>}
              eyebrow="Shopping"
              title={data.shoppingList.name}
              description="Handle the current list first, then sweep completed items into pantry transfer or cleanup."
            />

            <QuickActions label="View and bulk actions">
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
                Mark all purchased
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
                Clear completed
              </ActionButton>
            </QuickActions>

            {shoppingMealFilterId ? (
              <QuickActions label="Meal filter">
                <Badge>Filtered to one meal</Badge>
                <ActionButton size="sm" variant="ghost" onClick={() => setShoppingMealFilterId(null)}>
                  Clear filter
                </ActionButton>
              </QuickActions>
            ) : null}

            <div className="grid gap-4">
              {shoppingGroupMode === "aisle"
                ? shoppingItemsByAisle.map(([aisle, items]: [string, any[]]) => (
                  <Card className="space-y-3 p-4" key={aisle}>
                    <SectionHeader eyebrow="Aisle" title={aisle} titleAs="h3" />
                    <div className="grid gap-3">
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
                  </Card>
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

            {activeShoppingItems.length === 0 ? (
              <EmptyState message="The active shopping list is clear for now." />
            ) : null}

            {purchasedCount > 0 ? (
              <ListCard
                tone="accent"
                title={`${purchasedCount} items purchased`}
                description="Confirm pantry transfer once you are ready to finish the run."
                action={
                  <ActionButton size="sm" onClick={() => setPostPurchaseOpen(true)}>
                    Confirm / Complete
                  </ActionButton>
                }
              />
            ) : null}

            {completedShoppingItems.length > 0 ? (
              <Card className="space-y-3 p-4">
                <SectionHeader
                  eyebrow="Completed"
                  title={`Purchased or skipped (${completedShoppingItems.length})`}
                  titleAs="h3"
                />
                <div className="grid gap-3">
                  {completedShoppingItems.map((item: any) => (
                    <ListCard
                      key={`completed-${item.id}`}
                      title={item.ingredientName}
                      description={formatQuantity(item.quantityPurchased ?? item.quantityNeeded, item.unit)}
                      action={<Badge>{item.state}</Badge>}
                    />
                  ))}
                </div>
              </Card>
            ) : null}
          </Card>
        </section>
      ) : null}

      {shoppingWorkspaceTab === "history" ? (
        <section className="grid gap-4">
          <Card className="space-y-4" data-testid="food-shopping-history">
            <SectionHeader
              eyebrow="Trip history"
              title="Review completed trips without mixing them into the active list"
            />
            <div className="grid gap-3">
              {data.shoppingHistory.map((trip: any) => (
                <ListCard
                  key={trip.id}
                  title={trip.name}
                  description={`${trip.itemsPurchasedCount}/${trip.totalItemCount} purchased`}
                  meta={trip.sourceMealTitles ?? "No linked meal titles"}
                  action={
                    <ActionButton size="sm" variant="ghost" onClick={() => setSelectedHistoryTripId(trip.id)}>
                      Open
                    </ActionButton>
                  }
                />
              ))}
              {data.shoppingHistory.length === 0 ? (
                <EmptyState message="Completed shopping trips will appear here once a list has been finished." />
              ) : null}
            </div>
          </Card>
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
    <ListCard
      tone={item.state === "NeedsReview" ? "warning" : "default"}
      title={item.ingredientName}
      description={`${formatQuantity(item.quantityNeeded, item.unit)}${item.sourceMealTitle ? ` - ${item.sourceMealTitle}` : ""}`}
      action={item.state === "NeedsReview" ? <Badge variant="warning">Needs review</Badge> : null}
    >
      <QuickActions label="Shopping actions">
        <ActionButton
          size="sm"
          variant="success"
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
        </ActionButton>
        <ActionButton
          size="sm"
          variant="ghost"
          onClick={() => {
            setError(null);
            startTransition(() => {
              onSkipped(item).catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Unable to skip item.");
              });
            });
          }}
        >
          Didn&apos;t buy
        </ActionButton>
        <ActionButton
          size="sm"
          variant="outline"
          onClick={() => {
            setError(null);
            startTransition(() => {
              onDelete(item).catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Unable to delete shopping item.");
              });
            });
          }}
        >
          Remove
        </ActionButton>
      </QuickActions>
    </ListCard>
  );
}
