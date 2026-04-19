"use client";

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
    setActiveModuleTab,
    mealDate,
    setMealDate,
    setMealRows,
    mealTitle,
    setMealTitle,
    handleRecipeAddToShoppingList,
    handleDeleteRecipe
  } = useFoodHubContext();

  return (
    <article className="panel" data-testid="food-recipe-detail">
      <div className="eyebrow">Recipe detail</div>
      <h2>{selectedRecipe?.title ?? "Pick a recipe"}</h2>
      {selectedRecipe ? (
        <>
          <p className="muted" style={{ marginTop: "8px" }}>
            {selectedRecipe.summary ?? "This household-owned recipe keeps imported source and default household edits separate."}
          </p>
          <div className="pill-row" style={{ marginTop: "12px" }}>
            <span className="pill">Default rev {selectedRecipe.householdDefaultRevision.revisionNumber}</span>
            <span className="pill">Imported rev {selectedRecipe.importedSourceRevision.revisionNumber}</span>
            <span className="pill">{selectedRecipe.revisionCount} total revisions</span>
            {selectedRecipe.householdDefaultRevision.yieldText ? <span className="pill">{selectedRecipe.householdDefaultRevision.yieldText}</span> : null}
          </div>
          {selectedRecipe.source?.sourceUrl ? (
            <p className="muted" style={{ marginTop: "12px" }}>
              Imported from{" "}
              <a className="pill-link pill" href={selectedRecipe.source.sourceUrl} target="_blank" rel="noreferrer">
                {selectedRecipe.source.sourceSiteName ?? selectedRecipe.source.sourceUrl}
              </a>
            </p>
          ) : (
            <p className="muted" style={{ marginTop: "12px" }}>
              Manual household recipe. Imported lineage and household default are intentionally separate.
            </p>
          )}

          <div className="grid" style={{ marginTop: "14px" }}>
            <div className="stack-card">
              <div className="eyebrow">Household default ingredients</div>
              <div className="stack-list" style={{ marginTop: "10px" }}>
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
              <div className="stack-list" style={{ marginTop: "10px" }}>
                {selectedRecipe.householdDefaultRevision.steps.map((step: any) => (
                  <div className="stack-card" key={step.position}>
                    <strong>Step {step.position}</strong>
                    <div className="muted">{step.instruction}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="action-row">
            <button
              className="action-button"
              data-testid="food-recipe-start-cooking"
              disabled={isPending}
              onClick={() => {
                setError(null);
                startTransition(() => {
                  handleStartCooking({ recipeId: selectedRecipe.id }).catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : "Unable to start cooking.");
                  });
                });
              }}
            >
              Start cooking
            </button>
            <button
              className="food-secondary-button"
              data-testid="food-recipe-edit-default"
              disabled={isPending}
              onClick={startEditingSelectedRecipe}
            >
              Edit household default
            </button>
            <button
              className="food-secondary-button"
              data-testid="food-recipe-add-to-meal"
              disabled={isPending}
              onClick={() => {
                setActiveModuleTab("planning");
                setMealDate(mealDate || new Date().toISOString().slice(0, 10));
                setMealRows([{ recipeId: selectedRecipe.id, role: "Main" }]);
                if (!mealTitle) setMealTitle(selectedRecipe.title);
              }}
            >
              Add to meal
            </button>
            <button
              className="food-secondary-button"
              type="button"
              disabled={isPending}
              onClick={() => {
                setError(null);
                startTransition(() => {
                  handleRecipeAddToShoppingList(selectedRecipe.id).catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : "Unable to add recipe ingredients to shopping.");
                  });
                });
              }}
            >
              Add ingredients to shopping list
            </button>
            <button
              className="food-delete-button"
              type="button"
              disabled={isPending}
              onClick={() => {
                if (!window.confirm("Delete this recipe? This also removes dependent meal-plan and cooking records that reference it.")) {
                  return;
                }

                setError(null);
                startTransition(() => {
                  handleDeleteRecipe(selectedRecipe.id).catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : "Unable to delete recipe.");
                  });
                });
              }}
            >
              Delete recipe
            </button>
          </div>
        </>
      ) : (
        <p className="muted" style={{ marginTop: "12px" }}>
          Choose a recipe from the shared library to inspect or edit the household default.
        </p>
      )}
    </article>
  );
}
