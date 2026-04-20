"use client";

import { useState } from "react";
import { OverflowMenu } from "@/components/ui";
import { useFoodHubContext } from "../food-hub-context";

export function RecipeDetailPanel() {
  const {
    selectedRecipe,
    formatQuantity,
    isPending,
    setError,
    startTransition,
    handleStartCooking,
    startEditingSelectedRecipe,
    handleRecipeAddToShoppingList,
    setDeleteTarget,
    handlePlanMealFromRecipe
  } = useFoodHubContext();
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().slice(0, 10));
  const [plannedSlot, setPlannedSlot] = useState("Dinner");
  const [plannerOpen, setPlannerOpen] = useState(false);

  return (
    <article className="panel" data-testid="food-recipe-detail">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow">Recipe detail</div>
          <h2>{selectedRecipe?.title ?? "Pick a recipe"}</h2>
        </div>
        {selectedRecipe ? (
          <OverflowMenu
            items={[
              { label: "Edit", onClick: startEditingSelectedRecipe },
              { label: "Share", onClick: () => void navigator.clipboard?.writeText(window.location.href) },
              {
                label: "Add ingredients to shopping list",
                onClick: () => {
                  setError(null);
                  startTransition(() => {
                    handleRecipeAddToShoppingList(selectedRecipe.id).catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : "Unable to add recipe ingredients to shopping.");
                    });
                  });
                }
              },
              {
                label: "Delete",
                danger: true,
                onClick: () => setDeleteTarget({ kind: "recipe", id: selectedRecipe.id, title: selectedRecipe.title })
              }
            ]}
          />
        ) : null}
      </div>
      {selectedRecipe ? (
        <>
          <p className="muted mt-2">
            {selectedRecipe.summary ?? "This household-owned recipe keeps imported source and default household edits separate."}
          </p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              className="btn min-h-[44px]"
              data-testid="food-recipe-add-to-meal"
              type="button"
              onClick={() => setPlannerOpen((current) => !current)}
            >
              Add to Meal Plan
            </button>
            <button
              className="btn btn-primary min-h-[44px]"
              data-testid="food-recipe-start-cooking"
              disabled={isPending}
              type="button"
              onClick={() => {
                setError(null);
                startTransition(() => {
                  handleStartCooking({ recipeId: selectedRecipe.id }).catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : "Unable to start cooking.");
                  });
                });
              }}
            >
              Cook Now
            </button>
          </div>
          {plannerOpen ? (
            <div className="mt-3 grid gap-3 rounded-box border border-base-300 p-3">
              <div className="grid grid-cols-2 gap-3">
                <input className="input input-bordered min-h-[44px]" type="date" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} />
                <select className="select select-bordered min-h-[44px]" value={plannedSlot} onChange={(event) => setPlannedSlot(event.target.value)}>
                  <option>Breakfast</option>
                  <option>Lunch</option>
                  <option>Dinner</option>
                  <option>Snack</option>
                </select>
              </div>
              <button
                className="btn btn-primary min-h-[44px]"
                type="button"
                onClick={() => {
                  setError(null);
                  startTransition(() => {
                    handlePlanMealFromRecipe(selectedRecipe.id, plannedDate, plannedSlot)
                      .then(() => setPlannerOpen(false))
                      .catch((err: unknown) => {
                        setError(err instanceof Error ? err.message : "Unable to add to meal plan.");
                      });
                  });
                }}
              >
                Save to Meal Plan
              </button>
            </div>
          ) : null}

          <div className="pill-row mt-3">
            <span className="pill">Default rev {selectedRecipe.householdDefaultRevision.revisionNumber}</span>
            <span className="pill">Imported rev {selectedRecipe.importedSourceRevision.revisionNumber}</span>
            <span className="pill">{selectedRecipe.revisionCount} total revisions</span>
            {selectedRecipe.householdDefaultRevision.yieldText ? <span className="pill">{selectedRecipe.householdDefaultRevision.yieldText}</span> : null}
          </div>
          <div className="grid mt-3.5">
            <div className="stack-card">
              <div className="eyebrow">Household default ingredients</div>
              <div className="stack-list mt-2.5">
                {selectedRecipe.householdDefaultRevision.ingredients.map((ingredient: any, index: number) => (
                  <div className="stack-card" key={`${ingredient.ingredientName}-${index}`}>
                    <strong>{ingredient.ingredientName}</strong>
                    <div className="muted">{formatQuantity(ingredient.quantity, ingredient.unit)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="stack-card">
              <div className="eyebrow">Steps</div>
              <div className="stack-list mt-2.5">
                {selectedRecipe.householdDefaultRevision.steps.map((step: any) => (
                  <div className="stack-card" key={step.position}>
                    <strong>Step {step.position}</strong>
                    <div className="muted">{step.instruction}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="muted mt-3">
          Choose a recipe from the shared library to inspect or edit the household default.
        </p>
      )}
    </article>
  );
}
