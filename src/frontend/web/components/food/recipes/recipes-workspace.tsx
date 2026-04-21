"use client";

import { useFoodHubContext } from "../food-hub-context";
import { RecipeCaptureWorkspace } from "./recipe-capture-workspace";
import { RecipeDetailPanel } from "./recipe-detail-panel";
import { RecipeLibraryWorkspace } from "./recipe-library-workspace";

export function RecipesWorkspace() {
  const {
    recipeWorkspaceTab,
    setRecipeWorkspaceTab,
    setImportReview,
    setRecipeDraft,
    setImportUrl
  } = useFoodHubContext();

  return (
    <>
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Recipe workspace</div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2>Capture, browse, and maintain household recipes</h2>
            <div className="flex flex-wrap gap-2">
              <button
                className={`ui-button ui-button-sm ${recipeWorkspaceTab === "library" ? "ui-button-active" : "ui-button-ghost"}`}
                type="button"
                onClick={() => setRecipeWorkspaceTab("library")}
              >
                Library
              </button>
              <button
                className={`ui-button ui-button-sm ${recipeWorkspaceTab === "detail" ? "ui-button-active" : "ui-button-ghost"}`}
                type="button"
                onClick={() => setRecipeWorkspaceTab("detail")}
              >
                Detail
              </button>
              <button
                className={`ui-button ui-button-sm ${recipeWorkspaceTab === "capture" ? "ui-button-active" : "ui-button-primary"}`}
                type="button"
                onClick={() => {
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
        </article>
      </section>

      <section className={`grid ${recipeWorkspaceTab === "capture" ? "" : "food-section-grid"}`}>
        {recipeWorkspaceTab === "capture" ? <RecipeCaptureWorkspace /> : null}
        {recipeWorkspaceTab !== "capture" ? <RecipeLibraryWorkspace /> : null}
        {recipeWorkspaceTab !== "capture" ? <RecipeDetailPanel /> : null}
      </section>
    </>
  );
}
