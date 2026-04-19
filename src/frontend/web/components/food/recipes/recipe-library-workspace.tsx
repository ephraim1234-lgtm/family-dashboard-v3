"use client";

import { useFoodHubContext } from "../food-hub-context";

export function RecipeLibraryWorkspace() {
  const {
    recipeLibrary,
    buildFieldTestId,
    recipeQuery,
    setRecipeQuery,
    formatTimestamp,
    setSelectedRecipeId,
    setRecipeWorkspaceTab,
    handleDeleteRecipe,
    isPending,
    setError,
    startTransition
  } = useFoodHubContext();

  return (
    <article className="panel" data-testid="food-recipe-library">
      <div className="eyebrow">Recipe library</div>
      <div className="stack-card-header">
        <h2 style={{ margin: 0 }}>Shared household recipes</h2>
        <span className="pill">{recipeLibrary.length} shown</span>
      </div>
      <div className="field" style={{ marginTop: "12px" }}>
        <span>Search</span>
        <input
          aria-label="Recipe search"
          data-testid={buildFieldTestId("food-recipe-library", "search")}
          value={recipeQuery}
          onChange={(event) => setRecipeQuery(event.target.value)}
          placeholder="weeknight, chicken, lunch"
        />
      </div>
      {recipeLibrary.length > 0 ? (
        <div className="stack-list" style={{ marginTop: "14px" }}>
          {recipeLibrary.map((recipe: any) => (
            <div className="stack-card" data-testid={`food-recipe-library-item-${recipe.id}`} key={recipe.id}>
              <div className="stack-card-header">
                <div style={{ flex: 1 }}>
                  <strong>{recipe.title}</strong>
                  <div className="muted">
                    {recipe.ingredientCount} ingredients • {recipe.stepCount} steps • updated {formatTimestamp(recipe.updatedAtUtc)}
                  </div>
                </div>
              </div>
              <div className="pill-row">
                {recipe.tags ? <span className="pill">{recipe.tags}</span> : null}
                {recipe.yieldText ? <span className="pill">{recipe.yieldText}</span> : null}
                {recipe.sourceLabel ? <span className="pill">{recipe.sourceLabel}</span> : null}
              </div>
              <div className="food-card-actions">
                <button
                  className="food-secondary-button"
                  data-testid={`food-recipe-library-view-${recipe.id}`}
                  type="button"
                  onClick={() => {
                    setSelectedRecipeId(recipe.id);
                    setRecipeWorkspaceTab("detail");
                  }}
                >
                  Open recipe
                </button>
                <button
                  className="food-delete-button"
                  data-testid={`food-recipe-library-delete-${recipe.id}`}
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (!window.confirm(`Delete "${recipe.title}" from the household recipe library?`)) {
                      return;
                    }

                    setError(null);
                    startTransition(() => {
                      handleDeleteRecipe(recipe.id).catch((err: unknown) => {
                        setError(err instanceof Error ? err.message : "Unable to delete recipe.");
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
      ) : null}
    </article>
  );
}
