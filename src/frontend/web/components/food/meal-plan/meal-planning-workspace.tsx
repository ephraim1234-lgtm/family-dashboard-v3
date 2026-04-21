"use client";

import { useMemo, useState } from "react";
import { useFoodHubContext } from "../food-hub-context";
import { SubTabs } from "@/components/ui";

function formatDateLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function SlotList({
  slots,
  emptyMessage
}: {
  slots: any[];
  emptyMessage: string;
}) {
  const {
    setActiveModuleTab,
    setShoppingMealFilterId,
    setError,
    startTransition,
    handleStartCooking,
    handleRemoveRecipeFromMealPlanSlot,
    setDeleteTarget
  } = useFoodHubContext();

  if (slots.length === 0) {
    return <p className="muted mt-3">{emptyMessage}</p>;
  }

  return (
    <div className="stack-list mt-4">
      {slots.map((slot) => (
        <div className="stack-card" data-testid={`food-meal-slot-${slot.id}`} key={slot.id}>
          <div className="stack-card-header">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{slot.title}</strong>
                <span className="pill">{slot.slotName}</span>
                <button
                  className="ui-button ui-button-ghost ui-button-sm min-w-[44px]"
                  type="button"
                  onClick={() => setDeleteTarget({ kind: "meal-slot", id: slot.id, title: slot.title })}
                >
                  Trash
                </button>
              </div>
              <div className="muted">{formatDateLabel(slot.date)}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="ui-button ui-button-ghost ui-button-sm"
                type="button"
                onClick={() => {
                  setActiveModuleTab("shopping");
                  setShoppingMealFilterId(slot.id);
                }}
              >
                Shopping {slot.shoppingOpenIngredientCount}/{slot.shoppingTotalIngredientCount}
              </button>
              <button
                className="ui-button ui-button-primary ui-button-sm"
                data-testid={`food-meal-slot-cook-${slot.id}`}
                type="button"
                onClick={() => {
                  setError(null);
                  startTransition(() => {
                    handleStartCooking({ mealPlanSlotId: slot.id }).catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : "Unable to start meal cooking.");
                    });
                  });
                }}
              >
                Cook meal
              </button>
            </div>
          </div>

          <div className="stack-list mt-3">
            {slot.recipes.map((recipe: any) => (
              <div
                className="ui-inline-card flex min-h-[44px] items-center justify-between gap-3"
                key={recipe.id}
              >
                <span>{recipe.role}: {recipe.title}</span>
                <button
                  className="ui-button ui-button-ghost ui-button-sm min-w-[44px]"
                  type="button"
                  onClick={() => {
                    setError(null);
                    startTransition(() => {
                      handleRemoveRecipeFromMealPlanSlot(slot.id, recipe.recipeId, recipe.title).catch((err: unknown) => {
                        setError(err instanceof Error ? err.message : "Unable to remove recipe.");
                      });
                    });
                  }}
                >
                  Trash
                </button>
              </div>
            ))}
          </div>

          {slot.notes ? <div className="muted mt-3">{slot.notes}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function MealPlanningWorkspace() {
  const { data, setActiveModuleTab } = useFoodHubContext();
  const [planningTab, setPlanningTab] = useState<"day" | "upcoming">("day");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  const daySlots = useMemo(
    () => data.upcomingMeals.filter((slot: { date: string }) => slot.date === selectedDate),
    [data.upcomingMeals, selectedDate]
  );

  return (
    <>
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Meal planning</div>
          <h2>Review meals by day, then jump into shopping or cooking</h2>
          <SubTabs
            tabs={[
              { id: "day", label: "Day view" },
              { id: "upcoming", label: "Upcoming" }
            ]}
            activeTab={planningTab}
            onChange={setPlanningTab}
            ariaLabel="Meal planning views"
          />
        </article>
      </section>

      <section className="grid gap-4">
        {planningTab === "day" ? (
          <article className="panel" data-testid="food-meal-planning">
            <div className="eyebrow">Day view</div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2>{formatDateLabel(selectedDate)}</h2>
                <p className="muted mt-2">Meals are added from recipe cards and recipe detail views.</p>
              </div>
              <label className="field w-full max-w-xs">
                <span>Date</span>
                <input
                  aria-label="Planning date"
                  data-testid="food-meal-day-date"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
              </label>
            </div>

            <SlotList
              slots={daySlots}
              emptyMessage="No meals are planned for this day yet. Add a recipe from Recipes to start planning."
            />

            {daySlots.length === 0 ? (
              <div className="mt-4">
                <button className="ui-button ui-button-primary ui-button-sm" type="button" onClick={() => setActiveModuleTab("recipes")}>
                  Browse recipes
                </button>
              </div>
            ) : null}
          </article>
        ) : null}

        {planningTab === "upcoming" ? (
          <article className="panel" data-testid="food-meal-upcoming">
            <div className="eyebrow">Upcoming meals</div>
            <h2>Track the next meals and remove or cook them in place</h2>
            <SlotList
              slots={data.upcomingMeals}
              emptyMessage="Upcoming meals will appear here once you add them from Recipes."
            />
          </article>
        ) : null}
      </section>
    </>
  );
}
