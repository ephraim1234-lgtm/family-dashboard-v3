"use client";

import { useFoodHubContext } from "../food-hub-context";

export function RecipeCaptureWorkspace() {
  const {
    buildFieldTestId,
    importUrl,
    setImportUrl,
    isPending,
    setError,
    startTransition,
    handleImportRecipe,
    startManualRecipe,
    importReview,
    recipeDraft,
    setRecipeDraft,
    emptyIngredient,
    emptyStep,
    handleSaveRecipeDraft,
    setImportReview
  } = useFoodHubContext();

  return (
    <article className="panel" data-testid="food-recipe-capture-panel">
      <div className="eyebrow">Recipe capture</div>
      <h2>Bring in a recipe by link or create one from scratch</h2>
      <div className="field" style={{ marginTop: "12px" }}>
        <span>Recipe URL</span>
        <input
          aria-label="Recipe URL"
          data-testid={buildFieldTestId("food-import", "url")}
          value={importUrl}
          onChange={(event) => setImportUrl(event.target.value)}
          placeholder="https://example.com/recipe"
        />
      </div>
      <div className="action-row">
        <button
          className="action-button"
          data-testid="food-import-submit"
          disabled={isPending || !importUrl.trim()}
          onClick={() => {
            setError(null);
            startTransition(() => {
              handleImportRecipe().catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Unable to import recipe.");
              });
            });
          }}
        >
          Import for review
        </button>
        <button
          className="food-secondary-button"
          data-testid="food-recipe-start-manual"
          disabled={isPending}
          onClick={startManualRecipe}
        >
          New manual recipe
        </button>
      </div>

      {importReview ? (
        <div className="stack-card" style={{ marginTop: "16px" }} data-testid="food-import-review">
          <div className="pill-row">
            <span className="pill">Status {importReview.status}</span>
            <span className="pill">Confidence {(importReview.parserConfidence * 100).toFixed(0)}%</span>
            {importReview.sourceSiteName ? <span className="pill">{importReview.sourceSiteName}</span> : null}
          </div>
          {importReview.warnings.length > 0 ? (
            <div className="stack-list" style={{ marginTop: "10px" }}>
              {importReview.warnings.map((warning: string) => (
                <div className="stack-card home-attention-card" key={warning}>
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {recipeDraft ? (
        <div className="stack-list" style={{ marginTop: "16px" }}>
          <div className="stack-card" data-testid="food-recipe-draft">
            <div className="stack-card-header">
              <strong>
                {recipeDraft.mode === "edit"
                  ? "Edit household default"
                  : recipeDraft.mode === "import"
                    ? "Review imported recipe"
                    : "New household recipe"}
              </strong>
              <span className="pill">{recipeDraft.mode}</span>
            </div>
            <div className="field">
              <span>Title</span>
              <input
                aria-label="Recipe title"
                data-testid={buildFieldTestId("food-recipe-draft", "title")}
                value={recipeDraft.title}
                onChange={(event) => setRecipeDraft((current: any) => current ? { ...current, title: event.target.value } : current)}
              />
            </div>
            <div className="field">
              <span>Summary</span>
              <input
                aria-label="Recipe summary"
                data-testid={buildFieldTestId("food-recipe-draft", "summary")}
                value={recipeDraft.summary}
                onChange={(event) => setRecipeDraft((current: any) => current ? { ...current, summary: event.target.value } : current)}
              />
            </div>
            <div className="grid">
              <div className="field">
                <span>Yield</span>
                <input
                  aria-label="Recipe yield"
                  data-testid={buildFieldTestId("food-recipe-draft", "yield")}
                  value={recipeDraft.yieldText}
                  onChange={(event) => setRecipeDraft((current: any) => current ? { ...current, yieldText: event.target.value } : current)}
                />
              </div>
              <div className="field">
                <span>Tags</span>
                <input
                  aria-label="Recipe tags"
                  data-testid={buildFieldTestId("food-recipe-draft", "tags")}
                  value={recipeDraft.tags}
                  onChange={(event) => setRecipeDraft((current: any) => current ? { ...current, tags: event.target.value } : current)}
                />
              </div>
            </div>
            <div className="field">
              <span>Household notes</span>
              <input
                aria-label="Recipe household notes"
                data-testid={buildFieldTestId("food-recipe-draft", "notes")}
                value={recipeDraft.notes}
                onChange={(event) => setRecipeDraft((current: any) => current ? { ...current, notes: event.target.value } : current)}
              />
            </div>
          </div>

          <div className="stack-card" data-testid="food-recipe-draft-ingredients">
            <div className="stack-card-header">
              <strong>Ingredients</strong>
              <button
                className="pill-button"
                type="button"
                data-testid="food-recipe-add-ingredient"
                onClick={() => setRecipeDraft((current: any) => current ? {
                  ...current,
                  ingredients: [...current.ingredients, emptyIngredient()]
                } : current)}
              >
                + Ingredient
              </button>
            </div>
            <div className="stack-list" style={{ marginTop: "10px" }}>
              {recipeDraft.ingredients.map((ingredient: any, index: number) => (
                <div className="stack-card" data-testid={`food-recipe-ingredient-${index}`} key={`draft-ingredient-${index}`}>
                  <div className="grid">
                    <div className="field">
                      <span>Ingredient</span>
                      <input
                        aria-label={`Recipe ingredient ${index + 1}`}
                        data-testid={`food-recipe-ingredient-name-${index}`}
                        value={ingredient.ingredientName}
                        onChange={(event) => setRecipeDraft((current: any) => {
                          if (!current) return current;
                          const ingredients = [...current.ingredients];
                          ingredients[index] = { ...ingredients[index], ingredientName: event.target.value };
                          return { ...current, ingredients };
                        })}
                      />
                    </div>
                    <div className="field">
                      <span>Qty</span>
                      <input
                        aria-label={`Recipe ingredient quantity ${index + 1}`}
                        data-testid={`food-recipe-ingredient-quantity-${index}`}
                        type="number"
                        step="0.25"
                        value={ingredient.quantity ?? ""}
                        onChange={(event) => setRecipeDraft((current: any) => {
                          if (!current) return current;
                          const ingredients = [...current.ingredients];
                          ingredients[index] = {
                            ...ingredients[index],
                            quantity: event.target.value ? Number(event.target.value) : null
                          };
                          return { ...current, ingredients };
                        })}
                      />
                    </div>
                    <div className="field">
                      <span>Unit</span>
                      <input
                        aria-label={`Recipe ingredient unit ${index + 1}`}
                        data-testid={`food-recipe-ingredient-unit-${index}`}
                        value={ingredient.unit ?? ""}
                        onChange={(event) => setRecipeDraft((current: any) => {
                          if (!current) return current;
                          const ingredients = [...current.ingredients];
                          ingredients[index] = { ...ingredients[index], unit: event.target.value || null };
                          return { ...current, ingredients };
                        })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="stack-card" data-testid="food-recipe-draft-steps">
            <div className="stack-card-header">
              <strong>Steps</strong>
              <button
                className="pill-button"
                type="button"
                data-testid="food-recipe-add-step"
                onClick={() => setRecipeDraft((current: any) => current ? {
                  ...current,
                  steps: [...current.steps, emptyStep(current.steps.length + 1)]
                } : current)}
              >
                + Step
              </button>
            </div>
            <div className="stack-list" style={{ marginTop: "10px" }}>
              {recipeDraft.steps.map((step: any, index: number) => (
                <div className="stack-card" data-testid={`food-recipe-step-${index}`} key={`draft-step-${index}`}>
                  <div className="field">
                    <span>Step {index + 1}</span>
                    <input
                      aria-label={`Recipe step ${index + 1}`}
                      data-testid={`food-recipe-step-instruction-${index}`}
                      value={step.instruction}
                      onChange={(event) => setRecipeDraft((current: any) => {
                        if (!current) return current;
                        const steps = [...current.steps];
                        steps[index] = { position: index + 1, instruction: event.target.value };
                        return { ...current, steps };
                      })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="action-row">
            <button
              className="action-button"
              data-testid="food-recipe-save"
              disabled={isPending}
              onClick={() => {
                setError(null);
                startTransition(() => {
                  handleSaveRecipeDraft().catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : "Unable to save recipe.");
                  });
                });
              }}
            >
              {recipeDraft.mode === "edit" ? "Save household default" : "Save recipe"}
            </button>
            <button
              className="food-secondary-button"
              data-testid="food-recipe-cancel"
              disabled={isPending}
              onClick={() => {
                setRecipeDraft(null);
                setImportReview(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
