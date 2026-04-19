"use client";

import { useFoodHubContext } from "../food-hub-context";
import { ModuleTabs } from "../shared/module-tabs";
import { RecipeCaptureWorkspace } from "./recipe-capture-workspace";
import { RecipeDetailPanel } from "./recipe-detail-panel";
import { RecipeLibraryWorkspace } from "./recipe-library-workspace";

export function RecipesWorkspace() {
  const { recipeWorkspaceTab, setRecipeWorkspaceTab } = useFoodHubContext();

  return (
    <>
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Recipe workspace</div>
          <h2>Capture, browse, and maintain household recipes</h2>
          <ModuleTabs
            tabs={[
              { id: "capture", label: "Capture" },
              { id: "library", label: "Library" },
              { id: "detail", label: "Detail" }
            ]}
            activeTab={recipeWorkspaceTab}
            onChange={setRecipeWorkspaceTab}
          />
        </article>
      </section>

      <section className="grid food-section-grid">
        {recipeWorkspaceTab === "capture" ? <RecipeCaptureWorkspace /> : null}
        {recipeWorkspaceTab === "library" ? <RecipeLibraryWorkspace /> : null}
        {recipeWorkspaceTab === "detail" ? <RecipeDetailPanel /> : null}
      </section>
    </>
  );
}
