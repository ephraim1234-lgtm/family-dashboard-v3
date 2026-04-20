"use client";

import { useMemo, useState } from "react";
import { RecipeLibraryWorkspace } from "../recipes/recipe-library-workspace";
import { useFoodHubContext } from "../food-hub-context";

export function HomeWorkspace() {
  const {
    data,
    handleStartCooking,
    isPending,
    setError,
    startTransition,
    setActiveModuleTab,
    setPantryLowStockOnly,
    setRecipeWorkspaceTab,
    setImportReview,
    setRecipeDraft,
    setImportUrl
  } = useFoodHubContext();
  const [dismissedLowStock, setDismissedLowStock] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const todaysMeals = useMemo(
    () => data.upcomingMeals.filter((slot: { date: string }) => slot.date === today),
    [data.upcomingMeals, today]
  );

  if (todaysMeals.length === 0) {
    return (
      <section className="grid gap-4" data-testid="food-home-workspace">
        {!dismissedLowStock && data.summary.lowStockCount > 0 ? (
          <article className="alert">
            <div>
              <strong>{data.summary.lowStockCount} pantry items are running low.</strong>
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-sm min-h-[44px]"
                type="button"
                onClick={() => {
                  setPantryLowStockOnly(true);
                  setActiveModuleTab("pantry");
                }}
              >
                View pantry
              </button>
              <button className="btn btn-ghost btn-sm min-h-[44px]" type="button" onClick={() => setDismissedLowStock(true)}>
                Dismiss
              </button>
            </div>
          </article>
        ) : null}
        <article className="panel">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="eyebrow">Home</div>
              <h2>Nothing planned today - find something to cook</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary min-h-[44px]" type="button" onClick={() => setActiveModuleTab("recipes")}>
                Browse Recipes
              </button>
              <button
                className="btn btn-ghost min-h-[44px]"
                type="button"
                onClick={() => {
                  setActiveModuleTab("recipes");
                  setRecipeWorkspaceTab("capture");
                  setImportUrl("");
                  setImportReview(null);
                  setRecipeDraft(null);
                }}
              >
                Import Recipe
              </button>
            </div>
          </div>
          <RecipeLibraryWorkspace hideHeader />
        </article>
      </section>
    );
  }

  return (
    <section className="grid gap-4" data-testid="food-home-workspace">
      {!dismissedLowStock && data.summary.lowStockCount > 0 ? (
        <article className="alert">
          <div>
            <strong>{data.summary.lowStockCount} pantry items are running low.</strong>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-sm min-h-[44px]"
              type="button"
              onClick={() => {
                setPantryLowStockOnly(true);
                setActiveModuleTab("pantry");
              }}
            >
              View pantry
            </button>
            <button className="btn btn-ghost btn-sm min-h-[44px]" type="button" onClick={() => setDismissedLowStock(true)}>
              Dismiss
            </button>
          </div>
        </article>
      ) : null}
      {todaysMeals.map((slot: any) => (
        <article className="panel" key={slot.id}>
          <div className="eyebrow">{slot.slotName}</div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2>{slot.title}</h2>
              <div className="pill-row mt-3">
                {slot.recipes.map((recipe: any) => (
                  <span className="pill" key={recipe.id}>{recipe.title}</span>
                ))}
              </div>
            </div>
            <button
              className="btn btn-primary min-h-[44px]"
              disabled={isPending}
              type="button"
              onClick={() => {
                setError(null);
                startTransition(() => {
                  handleStartCooking({ mealPlanSlotId: slot.id }).catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : "Unable to start cooking.");
                  });
                });
              }}
            >
              Start Cooking
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
